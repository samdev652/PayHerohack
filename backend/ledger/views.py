import datetime
import io
from django.utils import timezone
from django.http import HttpResponse
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from .models import LedgerEntry
from traders.models import Trader, Contact
from payments.models import PaymentTransaction
from payments.services.payhero_client import initiate_stk_push, initiate_payout
from .serializers import LedgerEntrySerializer, VoiceCommandRequestSerializer
from voice.services.intent_parser import parse_voice_command

class VoiceCommandView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = VoiceCommandRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        trader = request.user
        transcribed_text = serializer.validated_data['transcribed_text']
        
        trader_context = {
            'id': str(trader.id),
            'name': trader.name,
            'business_name': trader.business_name,
            'preferred_language': trader.preferred_language,
        }
        
        parsed_intent = parse_voice_command(transcribed_text, trader_context)
        intent = parsed_intent.get('intent')
        spoken_confirmation = parsed_intent.get('spoken_confirmation', 'Sawa.')
        
        response_data = {
            'intent': intent,
            'spoken_confirmation': spoken_confirmation,
        }
        
        if intent in ['log_sale', 'log_expense']:
            amount = parsed_intent.get('amount')
            if amount is not None:
                entry = LedgerEntry.objects.create(
                    trader=trader,
                    entry_type='SALE' if intent == 'log_sale' else 'EXPENSE',
                    amount=amount,
                    item_description=parsed_intent.get('item_description'),
                    counterparty_name=parsed_intent.get('counterparty_name'),
                    raw_voice_text=transcribed_text
                )
                response_data['entry'] = LedgerEntrySerializer(entry).data
            else:
                response_data['spoken_confirmation'] = 'Samahani, sikupata kiasi vizuri. Tafadhali rudia.'
                
        elif intent == 'get_summary':
            today = timezone.localdate()
            entries = LedgerEntry.objects.filter(trader=trader, created_at__date=today)
            total_sales = sum(e.amount for e in entries if e.entry_type == 'SALE')
            total_expenses = sum(e.amount for e in entries if e.entry_type == 'EXPENSE')
            profit = total_sales - total_expenses
            
            if trader.preferred_language == 'en':
                summary_sentence = f"Today you sold {total_sales}, and spent {total_expenses}. Profit is {profit}."
            else:
                summary_sentence = f"Leo umeuza {total_sales}, na umetumia {total_expenses}. Faida ni {profit}."
                
            response_data['spoken_confirmation'] = summary_sentence
            response_data['summary'] = {
                'total_sales': total_sales,
                'total_expenses': total_expenses,
                'profit': profit,
            }
            
        elif intent in ['send_payment', 'request_payment']:
            amount = parsed_intent.get('amount')
            counterparty_name = parsed_intent.get('counterparty_name')
            
            if not amount or not counterparty_name:
                response_data['spoken_confirmation'] = "Samahani, sikupata kiasi au jina vizuri. Tafadhali rudia."
                return Response(response_data)
                
            import re
            
            # Check if counterparty_name is actually a spoken phone number
            cleaned_name = re.sub(r'[\s\-\(\)]', '', counterparty_name)
            if cleaned_name.isdigit() and len(cleaned_name) >= 9:
                counterparty_phone = cleaned_name
                if counterparty_phone.startswith('0'):
                    counterparty_phone = '254' + counterparty_phone[1:]
                elif counterparty_phone.startswith('+254'):
                    counterparty_phone = counterparty_phone[1:]
                elif not counterparty_phone.startswith('254'):
                    counterparty_phone = '254' + counterparty_phone
            else:
                contact = Contact.objects.filter(trader=trader, name__iexact=counterparty_name).first()
                if not contact:
                    # Fallback mock for demo if no contact is found
                    counterparty_phone = "254700000000"
                else:
                    counterparty_phone = contact.phone_number
                
            transaction_type = 'STK_PUSH' if intent == 'request_payment' else 'PAYOUT'
            
            requires_confirmation = parsed_intent.get('requires_confirmation', False)
            
            transaction = PaymentTransaction.objects.create(
                trader=trader,
                transaction_type=transaction_type,
                amount=amount,
                counterparty_phone=counterparty_phone,
                counterparty_name=counterparty_name,
                status='AWAITING_CONFIRMATION' if requires_confirmation else 'PENDING',
                raw_voice_text=transcribed_text
            )
            
            from django.conf import settings
            callback_url = settings.PAYHERO_CALLBACK_URL
            
            if not requires_confirmation:
                if transaction_type == 'STK_PUSH':
                    initiate_stk_push(counterparty_phone, float(amount), str(transaction.id), callback_url)
                else:
                    initiate_payout(counterparty_phone, float(amount), str(transaction.id), callback_url)
                
            response_data['transaction_id'] = str(transaction.id)
            response_data['requires_confirmation'] = requires_confirmation
            # keep spoken_confirmation from intent parser
            
        return Response(response_data)


class LedgerEntriesView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, trader_id=None):
        trader = request.user
        entries = LedgerEntry.objects.filter(trader=trader).order_by('-created_at')
        serializer = LedgerEntrySerializer(entries, many=True)
        return Response(serializer.data)


class LedgerSummaryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, trader_id=None):
        trader = request.user
        period = request.query_params.get('period', 'today')
        
        entries = LedgerEntry.objects.filter(trader=trader)
        
        # Calculate all-time balance (total sales minus total expenses)
        all_time_sales = sum(e.amount for e in entries if e.entry_type == 'SALE')
        all_time_expenses = sum(e.amount for e in entries if e.entry_type == 'EXPENSE')
        wallet_balance = all_time_sales - all_time_expenses

        if period == 'today':
            entries = entries.filter(created_at__date=timezone.localdate())
            
        total_sales = sum(e.amount for e in entries if e.entry_type == 'SALE')
        total_expenses = sum(e.amount for e in entries if e.entry_type == 'EXPENSE')
        
        return Response({
            'period': period,
            'total_sales': total_sales,
            'total_expenses': total_expenses,
            'profit': total_sales - total_expenses,
            'wallet_balance': wallet_balance,
        })

class LedgerStatementView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, trader_id=None):
        trader = request.user
        period_str = request.query_params.get('period', '30d')
        days = int(period_str.replace('d', '')) if period_str.endswith('d') else 30
        
        start_date = timezone.now() - datetime.timedelta(days=days)
        
        entries = LedgerEntry.objects.filter(trader=trader, created_at__gte=start_date)
        sales_entries = entries.filter(entry_type='SALE')
        
        total_sales = sum(e.amount for e in sales_entries)
        total_expenses = sum(e.amount for e in entries.filter(entry_type='EXPENSE'))
        profit = total_sales - total_expenses
        
        payments = PaymentTransaction.objects.filter(
            trader=trader, 
            status__in=['SUCCESS', 'COMPLETED', 'SUCCESSFUL'],
            created_at__gte=start_date
        )
        
        total_transactions = entries.count() + payments.count()
        
        # Calculate distinct days with sales
        active_days = set([e.created_at.date() for e in sales_entries])
        consistency_score = len(active_days)
        
        buffer = io.BytesIO()
        c = canvas.Canvas(buffer, pagesize=A4)
        width, height = A4
        
        # Header
        c.setFont("Helvetica-Bold", 18)
        c.drawString(50, height - 50, "SEMA BUSINESS STATEMENT")
        
        c.setFont("Helvetica", 12)
        c.drawString(50, height - 80, f"Trader: {trader.name}")
        c.drawString(50, height - 100, f"Business: {trader.business_name or 'N/A'}")
        c.drawString(50, height - 120, f"Period: Last {days} Days ({start_date.strftime('%b %d, %Y')} to {timezone.now().strftime('%b %d, %Y')})")
        
        # Financial Summary
        c.setFont("Helvetica-Bold", 14)
        c.drawString(50, height - 160, "Financial Summary")
        
        c.setFont("Helvetica", 12)
        c.drawString(50, height - 180, f"Total Sales: KES {total_sales:,.2f}")
        c.drawString(50, height - 200, f"Total Expenses: KES {total_expenses:,.2f}")
        c.drawString(50, height - 220, f"Net Profit: KES {profit:,.2f}")
        
        # Credit Analytics
        c.setFont("Helvetica-Bold", 14)
        c.drawString(50, height - 260, "Credit & Consistency Analytics")
        
        c.setFont("Helvetica", 12)
        c.drawString(50, height - 280, f"Total Transactions Logged: {total_transactions}")
        c.drawString(50, height - 300, f"Business Consistency: Logged sales on {consistency_score} of the last {days} days")
        
        # Recent Ledger Entries Table
        c.setFont("Helvetica-Bold", 14)
        c.drawString(50, height - 340, "Recent Transactions (Ledger)")
        
        y = height - 370
        c.setFont("Helvetica-Bold", 10)
        c.drawString(50, y, "Date")
        c.drawString(150, y, "Type")
        c.drawString(250, y, "Description")
        c.drawString(450, y, "Amount (KES)")
        y -= 20
        
        c.setFont("Helvetica", 10)
        recent_entries = entries.order_by('-created_at')[:15]
        for entry in recent_entries:
            c.drawString(50, y, entry.created_at.strftime('%Y-%m-%d %H:%M'))
            c.drawString(150, y, entry.entry_type)
            desc = (entry.item_description or entry.counterparty_name or 'General')[:30]
            c.drawString(250, y, desc)
            c.drawString(450, y, f"{entry.amount:,.2f}")
            y -= 20
            if y < 50:
                c.showPage()
                y = height - 50
                c.setFont("Helvetica", 10)
                
        c.save()
        buffer.seek(0)
        
        response = HttpResponse(buffer.getvalue(), content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="sema_statement_{trader.id}.pdf"'
        return response
