from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

from backend.app.core.config import get_settings


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Middleware enforcing production HTTP security response headers and CSRF protections."""

    def __init__(self, app):
        super().__init__(app)
        self.settings = get_settings()

    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        # CSRF Protection for cookie-authenticated state-changing requests
        if request.method in ("POST", "PUT", "PATCH", "DELETE"):
            has_auth_cookie = (
                self.settings.ACCESS_TOKEN_COOKIE_NAME in request.cookies
                or self.settings.REFRESH_TOKEN_COOKIE_NAME in request.cookies
            )
            if has_auth_cookie:
                origin = request.headers.get("origin")
                referer = request.headers.get("referer")
                allowed = self.settings.CORS_ORIGINS
                allowed_list = (
                    allowed if isinstance(allowed, list) else [allowed]
                )

                origin_to_check = origin
                if not origin_to_check and referer:
                    from urllib.parse import urlparse

                    parsed = urlparse(referer)
                    if parsed.scheme and parsed.netloc:
                        origin_to_check = f"{parsed.scheme}://{parsed.netloc}"

                if origin_to_check and origin_to_check not in allowed_list:
                    return JSONResponse(
                        status_code=403,
                        content={
                            "success": False,
                            "error": {
                                "code": "CSRF_FORBIDDEN",
                                "message": "Cross-Site Request Forgery (CSRF) protection: Untrusted Origin/Referer header.",
                            },
                        },
                    )

        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        return response
