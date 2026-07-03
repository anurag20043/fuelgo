# Auth-Gated App Testing Playbook (Fuel Delivery System)

The app uses Emergent Google OAuth. Testing agent must set a session cookie to access gated pages.

## Step 1 — Create Test User + Session in Mongo
```
mongosh --eval "
use('test_database');
var userId = 'test-user-' + Date.now();
var sessionToken = 'test_session_' + Date.now();
db.users.insertOne({
  user_id: userId,
  email: 'admin.test.' + Date.now() + '@example.com',
  name: 'Admin Test',
  picture: 'https://via.placeholder.com/150',
  role: 'admin',
  created_at: new Date()
});
db.user_sessions.insertOne({
  user_id: userId,
  session_token: sessionToken,
  expires_at: new Date(Date.now() + 7*24*60*60*1000),
  created_at: new Date()
});
print('Session token: ' + sessionToken);
print('User ID: ' + userId);
"
```

## Step 2 — Test Backend API
```
API=$(grep REACT_APP_BACKEND_URL /app/frontend/.env | cut -d'=' -f2)
TOK=YOUR_SESSION_TOKEN
curl -s "$API/api/auth/me" -H "Authorization: Bearer $TOK"
curl -s "$API/api/drivers" -H "Authorization: Bearer $TOK"
curl -s -X POST "$API/api/drivers" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOK" \
  -d '{"name":"Ravi","phone":"9999999999","vehicle":"MH-01-AB-1234"}'
```

## Step 3 — Browser Testing (Playwright)
```
await page.context.add_cookies([{
  "name": "session_token",
  "value": "YOUR_SESSION_TOKEN",
  "domain": "your-app.com",
  "path": "/",
  "httpOnly": True,
  "secure": True,
  "sameSite": "None"
}])
await page.goto("https://your-app.com/dashboard")
```

## Success Indicators
- `/api/auth/me` returns `{user_id, email, role, ...}`
- Dashboard loads without redirecting to `/`
- Admin can create drivers and see them in table

## Clean-up
```
mongosh --eval "
use('test_database');
db.users.deleteMany({email: /test|example\.com/});
db.user_sessions.deleteMany({session_token: /test_session/});
db.drivers.deleteMany({});
db.bookings.deleteMany({});
"
```
