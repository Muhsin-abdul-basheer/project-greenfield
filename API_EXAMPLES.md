# API Examples (curl)

Base URL: `http://localhost:3000`

## 1. Login (get cookie)

```bash
# Admin
curl -c cookies.txt -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"admin@fleet.com\",\"password\":\"admin123\"}"

# Crew
curl -c cookies.txt -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"crew@vessel.com\",\"password\":\"crew123\"}"
```

## 2. Me

```bash
curl -b cookies.txt http://localhost:3000/api/me
```

## 3. Logout

```bash
curl -b cookies.txt -X POST http://localhost:3000/api/auth/logout
```

## 4. Vessels

```bash
# List (crew: assigned only; admin: all)
curl -b cookies.txt http://localhost:3000/api/vessels

# Get one (replace :id)
curl -b cookies.txt "http://localhost:3000/api/vessels/:id"
```

## 5. Vessels – Admin only

```bash
# Create
curl -b cookies.txt -X POST http://localhost:3000/api/vessels \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"New Ship\",\"imo\":\"IMO9999999\",\"flag\":\"UK\",\"type\":\"Cargo\",\"status\":\"Active\",\"lastInspectionDate\":\"2024-01-15T00:00:00.000Z\"}"

# Update (replace :id)
curl -b cookies.txt -X PATCH "http://localhost:3000/api/vessels/:id" \
  -H "Content-Type: application/json" \
  -d "{\"status\":\"Under Maintenance\",\"assignedCrewIds\":[\"<CREW_USER_ID>\"]}"

# Delete (replace :id)
curl -b cookies.txt -X DELETE "http://localhost:3000/api/vessels/:id"
```

## 6. Issues

```bash
# List (crew: own; admin: all). Optional ?vesselId=:id
curl -b cookies.txt "http://localhost:3000/api/issues"
curl -b cookies.txt "http://localhost:3000/api/issues?vesselId=:vesselId"

# Get one (replace :id)
curl -b cookies.txt "http://localhost:3000/api/issues/:id"

# Create (crew only; replace :vesselId)
curl -b cookies.txt -X POST http://localhost:3000/api/issues \
  -H "Content-Type: application/json" \
  -d "{\"vesselId\":\":vesselId\",\"category\":\"Safety\",\"description\":\"Example issue\",\"priority\":\"Med\"}"

# Update (admin only; replace :id)
curl -b cookies.txt -X PATCH "http://localhost:3000/api/issues/:id" \
  -H "Content-Type: application/json" \
  -d "{\"status\":\"Resolved\",\"recommendation\":\"Fixed in dry dock.\"}"
```

## 7. Users (admin only)

```bash
curl -b cookies.txt http://localhost:3000/api/users
```

## 8. Maintenance Scan (admin only)

```bash
curl -b cookies.txt -X POST http://localhost:3000/api/maintenance-scan
```

---

Use `-b cookies.txt` for requests after login so the JWT cookie is sent.
