from rest_framework.routers import DefaultRouter

from .views import (
    AdvisorAssignmentViewSet,
    ArchiveViewSet,
    AuditLogViewSet,
    DocumentViewSet,
    EvaluationViewSet,
    FeedbackViewSet,
    GroupMemberViewSet,
    NotificationViewSet,
    ProgressLogViewSet,
    ProjectGroupViewSet,
    ProjectViewSet,
    SubmissionViewSet,
    UserViewSet,
)

router = DefaultRouter()
router.register("users", UserViewSet, basename="user")
router.register("groups", ProjectGroupViewSet, basename="projectgroup")
router.register("group-members", GroupMemberViewSet, basename="groupmember")
router.register("advisor-assignments", AdvisorAssignmentViewSet, basename="advisorassignment")
router.register("projects", ProjectViewSet, basename="project")
router.register("submissions", SubmissionViewSet, basename="submission")
router.register("documents", DocumentViewSet, basename="document")
router.register("progress-logs", ProgressLogViewSet, basename="progresslog")
router.register("feedback", FeedbackViewSet, basename="feedback")
router.register("evaluations", EvaluationViewSet, basename="evaluation")
router.register("archive", ArchiveViewSet, basename="archive")
router.register("notifications", NotificationViewSet, basename="notification")
router.register("audit-logs", AuditLogViewSet, basename="auditlog")

urlpatterns = router.urls
