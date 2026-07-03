from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response

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
from .permissions import IsAdmin, IsAdminOrReadOnly, IsAdvisorOrAdmin
from .serializers import (
    AdvisorAssignmentSerializer,
    ArchiveSerializer,
    AuditLogSerializer,
    DocumentSerializer,
    EvaluationSerializer,
    FeedbackSerializer,
    GroupMemberSerializer,
    NotificationSerializer,
    ProgressLogSerializer,
    ProjectGroupSerializer,
    ProjectSerializer,
    SubmissionSerializer,
    UserCreateSerializer,
    UserSerializer,
)


class UserViewSet(viewsets.ModelViewSet):
    """Full CRUD restricted to admins; every authenticated user can read the list
    (needed for things like advisor dropdowns) and fetch their own profile."""

    queryset = User.objects.all().order_by("full_name")
    permission_classes = [IsAdminOrReadOnly]

    def get_serializer_class(self):
        if self.action == "create":
            return UserCreateSerializer
        return UserSerializer

    @action(detail=False, methods=["get"], permission_classes=[permissions.IsAuthenticated])
    def me(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)


class ProjectGroupViewSet(viewsets.ModelViewSet):
    queryset = ProjectGroup.objects.all().prefetch_related("members", "advisor_assignments")
    serializer_class = ProjectGroupSerializer
    permission_classes = [IsAdminOrReadOnly]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if user.role == "student":
            return qs.filter(members__student=user).distinct()
        if user.role == "advisor":
            return qs.filter(advisor_assignments__advisor=user).distinct()
        return qs  # admin sees all


class GroupMemberViewSet(viewsets.ModelViewSet):
    queryset = GroupMember.objects.all()
    serializer_class = GroupMemberSerializer
    permission_classes = [IsAdminOrReadOnly]


class AdvisorAssignmentViewSet(viewsets.ModelViewSet):
    queryset = AdvisorAssignment.objects.all()
    serializer_class = AdvisorAssignmentSerializer
    permission_classes = [IsAdminOrReadOnly]


class ProjectViewSet(viewsets.ModelViewSet):
    queryset = Project.objects.select_related("group").all()
    serializer_class = ProjectSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if user.role == "student":
            return qs.filter(group__members__student=user).distinct()
        if user.role == "advisor":
            return qs.filter(group__advisor_assignments__advisor=user).distinct()
        return qs


class SubmissionViewSet(viewsets.ModelViewSet):
    queryset = Submission.objects.select_related("project").prefetch_related("documents", "feedback").all()
    serializer_class = SubmissionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if user.role == "student":
            return qs.filter(project__group__members__student=user).distinct()
        if user.role == "advisor":
            return qs.filter(project__group__advisor_assignments__advisor=user).distinct()
        return qs

    def perform_create(self, serializer):
        serializer.save(submitted_by=self.request.user)


class DocumentViewSet(viewsets.ModelViewSet):
    queryset = Document.objects.all()
    serializer_class = DocumentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(uploaded_by=self.request.user)


class ProgressLogViewSet(viewsets.ModelViewSet):
    queryset = ProgressLog.objects.select_related("project").all()
    serializer_class = ProgressLogSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if user.role == "student":
            return qs.filter(project__group__members__student=user).distinct()
        if user.role == "advisor":
            return qs.filter(project__group__advisor_assignments__advisor=user).distinct()
        return qs

    def perform_create(self, serializer):
        serializer.save(logged_by=self.request.user)


class FeedbackViewSet(viewsets.ModelViewSet):
    queryset = Feedback.objects.all()
    serializer_class = FeedbackSerializer
    permission_classes = [IsAdvisorOrAdmin]

    def perform_create(self, serializer):
        serializer.save(advisor=self.request.user)


class EvaluationViewSet(viewsets.ModelViewSet):
    queryset = Evaluation.objects.all()
    serializer_class = EvaluationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if user.role == "student":
            return qs.filter(project__group__members__student=user).distinct()
        if user.role == "advisor":
            return qs.filter(project__group__advisor_assignments__advisor=user).distinct()
        return qs

    def perform_create(self, serializer):
        serializer.save(evaluator=self.request.user)


class ArchiveViewSet(viewsets.ModelViewSet):
    queryset = Archive.objects.all().order_by("-published_at")
    serializer_class = ArchiveSerializer
    permission_classes = [IsAdminOrReadOnly]  # archive is read-only reference for everyone, admin publishes


class NotificationViewSet(viewsets.ModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(recipient=self.request.user)

    @action(detail=True, methods=["post"])
    def mark_read(self, request, pk=None):
        notification = self.get_object()
        notification.is_read = True
        notification.save(update_fields=["is_read"])
        return Response(NotificationSerializer(notification).data)


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = AuditLog.objects.all()
    serializer_class = AuditLogSerializer
    permission_classes = [IsAdmin]
