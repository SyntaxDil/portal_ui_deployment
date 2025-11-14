-- Run this in Neon SQL Editor to see all registered users

SELECT 
    id,
    username,
    email,
    role,
    active,
    created_at
FROM users
ORDER BY created_at DESC;

-- This will show you all users who have registered!
