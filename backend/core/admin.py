from django.contrib import admin

from .models import (
    AdvisorAssignment,
    Archive,
    AuditLog,
    Document,
    Evaluation,
    Feedback,
    GroupMember,
    Notification,
    Project,
    ProjectGroup,
    ProgressLog,
    Submission,
    User,
)


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ("full_name", "email", "role", "department", "is_active")
    list_filter = ("role", "department", "is_active")
    search_fields = ("full_name", "email")


@admin.register(ProjectGroup)
class ProjectGroupAdmin(admin.ModelAdmin):
    list_display = ("group_name", "academic_year", "semester", "status")
    list_filter = ("status", "academic_year")


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ("title", "group", "stage", "updated_at")
    list_filter = ("stage",)
    search_fields = ("title",)


admin.site.register(GroupMember)
admin.site.register(AdvisorAssignment)
admin.site.register(Submission)
admin.site.register(Document)
admin.site.register(ProgressLog)
admin.site.register(Feedback)
admin.site.register(Evaluation)
admin.site.register(Archive)
admin.site.register(Notification)
admin.site.register(AuditLog)
