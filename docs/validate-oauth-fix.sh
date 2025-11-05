#!/bin/bash

# Validation script for OAuth user info display fix
# Checks that the fix is properly implemented in the codebase

set -e

echo "🔍 Validating OAuth Fix Implementation..."
echo ""

OAUTH_CALLBACK_FILE="apps/frontend/app/(auth)/oauth/callback/page.tsx"
AUTH_CONTEXT_FILE="apps/frontend/contexts/AuthContext.tsx"
API_CLIENT_FILE="apps/frontend/lib/apiClient.ts"

PASS=0
FAIL=0

# Helper functions
check_pass() {
  echo "✅ PASS: $1"
  ((PASS++))
}

check_fail() {
  echo "❌ FAIL: $1"
  ((FAIL++))
}

# Test 1: OAuth callback imports useAuth
echo "Test 1: OAuth callback imports useAuth"
if grep -q "import { useAuth } from '@/contexts/AuthContext';" "$OAUTH_CALLBACK_FILE"; then
  check_pass "OAuth callback imports useAuth from AuthContext"
else
  check_fail "OAuth callback missing useAuth import"
fi
echo ""

# Test 2: OAuth callback uses refetchUser hook
echo "Test 2: OAuth callback extracts refetchUser from useAuth"
if grep -q "const { refetchUser } = useAuth();" "$OAUTH_CALLBACK_FILE"; then
  check_pass "OAuth callback extracts refetchUser from hook"
else
  check_fail "OAuth callback not using refetchUser hook"
fi
echo ""

# Test 3: OAuth callback calls refetchUser before redirect
echo "Test 3: OAuth callback calls await refetchUser()"
if grep -q "await refetchUser();" "$OAUTH_CALLBACK_FILE"; then
  check_pass "OAuth callback calls await refetchUser()"
else
  check_fail "OAuth callback missing await refetchUser() call"
fi
echo ""

# Test 4: AuthContext has refetchUser method
echo "Test 4: AuthContext exports refetchUser"
if grep -q "refetchUser" "$AUTH_CONTEXT_FILE"; then
  check_pass "AuthContext has refetchUser in context value"
else
  check_fail "AuthContext missing refetchUser"
fi
echo ""

# Test 5: AuthContext fetches user on mount
echo "Test 5: AuthContext fetches user on mount"
if grep -q "fetchCurrentUser();" "$AUTH_CONTEXT_FILE"; then
  check_pass "AuthContext calls fetchCurrentUser on mount"
else
  check_fail "AuthContext not fetching user on mount"
fi
echo ""

# Test 6: apiClient includes credentials
echo "Test 6: apiClient includes credentials for cookies"
if grep -q "credentials: 'include'" "$API_CLIENT_FILE"; then
  check_pass "apiClient configured with credentials: 'include'"
else
  check_fail "apiClient missing credentials configuration"
fi
echo ""

# Test 7: No TypeScript errors in modified file
echo "Test 7: TypeScript check on OAuth callback"
cd "$(dirname "$0")/apps/frontend"
if npx tsc --noEmit --skipLibCheck "$OAUTH_CALLBACK_FILE" 2>/dev/null; then
  check_pass "No TypeScript errors in OAuth callback"
else
  check_fail "TypeScript errors detected in OAuth callback"
fi
cd - > /dev/null
echo ""

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 VALIDATION SUMMARY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Passed: $PASS"
echo "❌ Failed: $FAIL"
echo ""

if [ $FAIL -eq 0 ]; then
  echo "🎉 All validations passed! OAuth fix is correctly implemented."
  exit 0
else
  echo "⚠️  Some validations failed. Please review the fix."
  exit 1
fi
