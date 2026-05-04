from django.contrib import admin
from django.utils.html import format_html

from .models import ScrapeSource, ScrapeJob, ScrapedListing


@admin.register(ScrapeSource)
class ScrapeSourceAdmin(admin.ModelAdmin):
    list_display = ('name', 'scraper_class', 'is_active', 'max_listings',
                    'schedule_hours', 'last_scraped_at', 'total_jobs')
    list_filter = ('is_active',)
    search_fields = ('name', 'scraper_class')
    readonly_fields = ('last_scraped_at', 'created_at', 'updated_at')

    @admin.display(description='Jobs')
    def total_jobs(self, obj):
        return obj.jobs.count()


class ScrapeJobInline(admin.TabularInline):
    model = ScrapeJob
    extra = 0
    readonly_fields = ('status', 'started_at', 'finished_at', 'records_scraped',
                       'records_imported', 'records_duplicates', 'records_failed')
    can_delete = False


@admin.register(ScrapeJob)
class ScrapeJobAdmin(admin.ModelAdmin):
    list_display = (
        'id', 'source', 'status_badge', 'triggered_by',
        'records_scraped', 'records_imported', 'records_duplicates',
        'records_failed', 'started_at', 'duration_display',
    )
    list_filter = ('status', 'source', 'triggered_by')
    search_fields = ('source__name', 'error_log')
    readonly_fields = (
        'source', 'status', 'triggered_by', 'started_at', 'finished_at',
        'urls_discovered', 'records_scraped', 'records_normalized',
        'records_imported', 'records_duplicates', 'records_failed',
        'error_log', 'created_at', 'updated_at',
    )
    ordering = ('-created_at',)

    @admin.display(description='Status')
    def status_badge(self, obj):
        colours = {
            'pending': '#aaa', 'running': '#007bff',
            'completed': '#28a745', 'failed': '#dc3545', 'cancelled': '#fd7e14',
        }
        colour = colours.get(obj.status, '#aaa')
        return format_html(
            '<span style="color:{};font-weight:bold">{}</span>',
            colour, obj.get_status_display()
        )

    @admin.display(description='Duration')
    def duration_display(self, obj):
        secs = obj.duration_seconds
        if secs is None:
            return '—'
        if secs < 60:
            return f"{secs:.0f}s"
        return f"{secs/60:.1f}m"


@admin.register(ScrapedListing)
class ScrapedListingAdmin(admin.ModelAdmin):
    list_display = (
        'short_id', 'source', 'status_badge', 'title_short',
        'governorate', 'price_display', 'property_type', 'scraped_at',
    )
    list_filter = ('status', 'source')
    search_fields = ('source_url', 'raw_data', 'normalized_data')
    readonly_fields = (
        'external_id', 'source', 'job', 'source_url', 'status',
        'raw_data', 'normalized_data', 'property', 'duplicate_of',
        'error_message', 'scraped_at', 'normalized_at', 'imported_at',
    )
    ordering = ('-scraped_at',)

    @admin.display(description='ID')
    def short_id(self, obj):
        return obj.external_id[:8] + '…'

    @admin.display(description='Status')
    def status_badge(self, obj):
        colours = {
            'raw': '#aaa', 'normalized': '#007bff',
            'imported': '#28a745', 'duplicate': '#fd7e14', 'failed': '#dc3545',
        }
        colour = colours.get(obj.status, '#aaa')
        return format_html(
            '<span style="color:{};font-weight:bold">{}</span>',
            colour, obj.get_status_display()
        )

    @admin.display(description='Title')
    def title_short(self, obj):
        return (obj.raw_data or {}).get('title', '—')[:60]

    @admin.display(description='Governorate')
    def governorate(self, obj):
        return (obj.normalized_data or {}).get('governorate', '—')

    @admin.display(description='Price (TND)')
    def price_display(self, obj):
        p = (obj.normalized_data or {}).get('price_tnd')
        return f"{p:,.0f}" if p else '—'

    @admin.display(description='Type')
    def property_type(self, obj):
        return (obj.normalized_data or {}).get('property_type', '—')
