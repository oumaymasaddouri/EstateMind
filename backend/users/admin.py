from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, UserActivity, SavedProperty, UserValuation, Portfolio


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """Custom user admin interface"""
    
    list_display = ('email', 'full_name', 'is_staff', 'is_active', 'created_at')
    list_filter = ('is_staff', 'is_active', 'is_email_verified', 'created_at')
    search_fields = ('email', 'full_name')
    ordering = ('-created_at',)
    
    fieldsets = (
        ('Authentication', {
            'fields': ('email', 'password', 'is_email_verified')
        }),
        ('Profile', {
            'fields': ('full_name', 'phone', 'profile_image')
        }),
        ('Permissions', {
            'fields': ('is_staff', 'is_superuser', 'groups', 'user_permissions')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    readonly_fields = ('created_at', 'updated_at')
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'full_name', 'password1', 'password2'),
        }),
    )


@admin.register(UserActivity)
class UserActivityAdmin(admin.ModelAdmin):
    list_display = ('user', 'activity_type', 'feature', 'created_at')
    list_filter = ('activity_type', 'created_at')
    search_fields = ('user__email', 'feature')
    ordering = ('-created_at',)


@admin.register(SavedProperty)
class SavedPropertyAdmin(admin.ModelAdmin):
    list_display = ('user', 'property_id', 'title', 'price', 'location', 'created_at')
    list_filter = ('created_at',)
    search_fields = ('user__email', 'property_id', 'title', 'location')
    ordering = ('-created_at',)


@admin.register(UserValuation)
class UserValuationAdmin(admin.ModelAdmin):
    list_display = ('user', 'property_id', 'estimated_price', 'input_location', 'created_at')
    list_filter = ('input_location', 'created_at')
    search_fields = ('user__email', 'property_id', 'input_location')
    ordering = ('-created_at',)


@admin.register(Portfolio)
class PortfolioAdmin(admin.ModelAdmin):
    list_display = ('user', 'property_name', 'purchase_price', 'current_value', 'monthly_rent', 'created_at')
    list_filter = ('created_at',)
    search_fields = ('user__email', 'property_name')
    ordering = ('-created_at',)
