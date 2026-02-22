/**
 * One-time script to create a LogMeal APIUser and get its token.
 *
 * You need your APICompany token (from LogMeal Profile/Dashboard).
 * Run: node scripts/create-logmeal-user.js YOUR_API_COMPANY_TOKEN
 *
 * The script will create an APIUser and print the token.
 * Put that token in .env as VITE_LOGMEAL_API_KEY
 */

const token = process.argv[2]
if (!token) {
  console.error('Usage: node scripts/create-logmeal-user.js YOUR_API_COMPANY_TOKEN')
  console.error('Get your APICompany token from: LogMeal Dashboard → Profile')
  process.exit(1)
}

async function createUser() {
  const res = await fetch('https://api.logmeal.com/v2/users/signUp', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      username: `zerocrumb_${Date.now()}`,
      language: 'eng',
    }),
  })

  const data = await res.json().catch(() => ({}))

  if (!res.ok) {
    console.error('Error:', data.message || res.statusText)
    console.error('Status:', res.status)
    if (res.status === 401) {
      console.error('\nYour token may be invalid or expired.')
    }
    if (res.status === 403) {
      console.error('\nYou may have hit the APIUser limit on your plan.')
    }
    process.exit(1)
  }

  console.log('\n✅ APIUser created successfully!\n')
  console.log('Add this to your .env file:\n')
  console.log(`VITE_LOGMEAL_API_KEY=${data.token}\n`)
  console.log('Then restart your dev server (npm run dev)\n')
}

createUser()
