from django.contrib import admin
from .models import StripeCustomer, Payment, Subscription


@admin.register(StripeCustomer)
class StripeCustomerAdmin(admin.ModelAdmin):
    list_display = ('user', 'stripe_customer_id', 'created_at')
    search_fields = ('user__email', 'stripe_customer_id')
    readonly_fields = ('stripe_customer_id', 'created_at', 'updated_at')


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ('user', 'plan', 'amount', 'status', 'created_at')
    list_filter = ('plan', 'status', 'created_at')
    search_fields = ('user__email', 'stripe_payment_intent_id')
    readonly_fields = ('stripe_payment_intent_id', 'created_at', 'updated_at')


@admin.register(Subscription)
class SubscriptionAdmin(admin.ModelAdmin):
    list_display = ('user', 'plan', 'status', 'current_period_end', 'created_at')
    list_filter = ('plan', 'status', 'created_at')
    search_fields = ('user__email', 'stripe_subscription_id')
    readonly_fields = ('stripe_subscription_id', 'created_at', 'updated_at')
