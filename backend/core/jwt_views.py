from rest_framework_simplejwt.views import TokenObtainPairView

from .serializers import RoleAwareTokenObtainPairSerializer


class RoleAwareTokenObtainPairView(TokenObtainPairView):
    serializer_class = RoleAwareTokenObtainPairSerializer
