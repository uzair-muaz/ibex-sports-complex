# Flutter client notes (companion to api-v1-flutter)

## Suggested packages

- `google_sign_in` — obtain Google ID token
- `http` or `dio` — call `/api/v1`
- `flutter_secure_storage` — persist `accessToken`
- Optional: `openapi_generator` / hand-written DTOs from `/api/v1/openapi`

## Minimal auth flow

1. `GoogleSignIn().signIn()` → account
2. `authentication.idToken`
3. `POST {APP_URL}/api/v1/auth/google` with `{ "idToken": "..." }`
4. Save `accessToken`
5. All customer calls: header `Authorization: Bearer <accessToken>`

## Base URL

Use the same host as the Next deployment (`APP_URL`). Do not hardcode `/api/bff` — use `/api/v1`.
