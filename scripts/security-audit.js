/**
 * Security Initialization & Audit Script
 * Run this to validate security setup and identify issues
 */

import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Colors for console output
const colors = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
}

/**
 * Security Audit Results
 */
class SecurityAudit {
  constructor() {
    this.checks = []
    this.passed = 0
    this.failed = 0
    this.warnings = 0
  }

  pass(name, message = "") {
    this.passed++
    console.log(`${colors.green}✓${colors.reset} ${name}`)
    if (message) console.log(`  ${message}`)
  }

  fail(name, message = "") {
    this.failed++
    console.log(`${colors.red}✗${colors.reset} ${name}`)
    if (message) console.log(`  ${message}`)
  }

  warn(name, message = "") {
    this.warnings++
    console.log(`${colors.yellow}⚠${colors.reset} ${name}`)
    if (message) console.log(`  ${message}`)
  }

  summary() {
    console.log("\n" + "=".repeat(50))
    console.log("Security Audit Summary:")
    console.log(`${colors.green}Passed: ${this.passed}${colors.reset}`)
    console.log(`${colors.yellow}Warnings: ${this.warnings}${colors.reset}`)
    console.log(`${colors.red}Failed: ${this.failed}${colors.reset}`)
    console.log("=".repeat(50) + "\n")
  }
}

/**
 * Check environment variables
 */
async function checkEnvironmentVariables() {
  console.log(`\n${colors.blue}Checking Environment Variables...${colors.reset}`)
  const audit = new SecurityAudit()

  const requiredVars = [
    "JWT_SECRET",
    "ENCRYPTION_KEY",
    "SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
  ]

  for (const varName of requiredVars) {
    if (process.env[varName]) {
      const value = process.env[varName]
      const isLong = value.length >= 32
      audit.pass(varName, isLong ? "Good length" : "WARNING: Too short")
    } else {
      audit.fail(varName, "Environment variable not set")
    }
  }

  audit.summary()
  return audit.failed === 0
}

/**
 * Check for committed secrets
 */
async function checkForCommittedSecrets() {
  console.log(`\n${colors.blue}Checking for Committed Secrets...${colors.reset}`)
  const audit = new SecurityAudit()

  // Files to check
  const filesToCheck = [
    ".env.production",
    ".env",
    "firebase.json",
  ]

  const secretPatterns = [
    /cloudflare_api_token\s*=\s*[a-z0-9]{20,}/i,
    /api_key\s*=\s*[a-zA-Z0-9]{20,}/i,
    /secret_key\s*=\s*[a-zA-Z0-9]{20,}/i,
    /password\s*=\s*[^\s]/i,
  ]

  for (const file of filesToCheck) {
    const filePath = path.join(__dirname, "..", file)
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, "utf8")

      let hasSecrets = false
      for (const pattern of secretPatterns) {
        if (pattern.test(content)) {
          hasSecrets = true
          break
        }
      }

      if (hasSecrets) {
        audit.fail(file, "Contains what appears to be secrets")
      } else {
        audit.pass(file, "No obvious secrets found")
      }
    } else {
      audit.warn(file, "File not found")
    }
  }

  audit.summary()
  return audit.failed === 0
}

/**
 * Check security files exist
 */
async function checkSecurityFiles() {
  console.log(`\n${colors.blue}Checking Security Files...${colors.reset}`)
  const audit = new SecurityAudit()

  const requiredFiles = [
    "lib/security.js",
    "lib/apiProtection.js",
    "lib/securityConfig.js",
    "SECURITY.md",
  ]

  for (const file of requiredFiles) {
    const filePath = path.join(__dirname, "..", file)
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath)
      audit.pass(file, `${stats.size} bytes`)
    } else {
      audit.fail(file, "File not found")
    }
  }

  audit.summary()
  return audit.failed === 0
}

/**
 * Check .gitignore for sensitive files
 */
async function checkGitIgnore() {
  console.log(`\n${colors.blue}Checking .gitignore...${colors.reset}`)
  const audit = new SecurityAudit()

  const gitignorePath = path.join(__dirname, "..", ".gitignore")
  if (!fs.existsSync(gitignorePath)) {
    audit.fail(".gitignore", "File not found")
    audit.summary()
    return false
  }

  const content = fs.readFileSync(gitignorePath, "utf8")
  const requiredPatterns = [
    ".env",
    "node_modules",
    ".next",
    ".firebase",
  ]

  for (const pattern of requiredPatterns) {
    if (content.includes(pattern)) {
      audit.pass(`Ignored: ${pattern}`)
    } else {
      audit.fail(`Missing: ${pattern}`, "Should be in .gitignore")
    }
  }

  audit.summary()
  return audit.failed === 0
}

/**
 * Check API routes for security
 */
async function checkAPIRoutes() {
  console.log(`\n${colors.blue}Checking API Routes...${colors.reset}`)
  const audit = new SecurityAudit()

  const apiDir = path.join(__dirname, "..", "app", "api")

  if (!fs.existsSync(apiDir)) {
    audit.warn("API directory", "Not found at app/api")
    audit.summary()
    return true
  }

  let apiRouteCount = 0
  let protectedCount = 0

  function checkDirectory(dir) {
    const files = fs.readdirSync(dir)
    for (const file of files) {
      const filePath = path.join(dir, file)
      const stat = fs.statSync(filePath)

      if (stat.isDirectory()) {
        checkDirectory(filePath)
      } else if (file === "route.js") {
        apiRouteCount++
        const content = fs.readFileSync(filePath, "utf8")

        if (content.includes("protectedAPI") || content.includes("requireAuth")) {
          protectedCount++
        }
      }
    }
  }

  checkDirectory(apiDir)

  if (apiRouteCount > 0) {
    const percentage = Math.round((protectedCount / apiRouteCount) * 100)
    if (percentage === 100) {
      audit.pass(`All API routes protected (${apiRouteCount}/${apiRouteCount})`)
    } else if (percentage >= 80) {
      audit.warn(`Most API routes protected (${protectedCount}/${apiRouteCount})`)
    } else {
      audit.fail(`Low API protection (${protectedCount}/${apiRouteCount})`)
    }
  }

  audit.summary()
  return audit.failed === 0
}

/**
 * Check dependencies for vulnerabilities
 */
async function checkDependencies() {
  console.log(`\n${colors.blue}Checking Dependencies...${colors.reset}`)
  const audit = new SecurityAudit()

  const packageJsonPath = path.join(__dirname, "..", "package.json")
  if (!fs.existsSync(packageJsonPath)) {
    audit.warn("package.json", "Not found")
    audit.summary()
    return true
  }

  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"))
  const dependencies = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
  }

  // Security-critical packages
  const securityPackages = [
    "bcryptjs",
    "jsonwebtoken",
    "crypto",
  ]

  for (const pkg of securityPackages) {
    if (dependencies[pkg]) {
      audit.pass(`${pkg} installed`)
    } else {
      audit.warn(`${pkg} not found`)
    }
  }

  // Warn about insecure packages
  const insecurePackages = [
    "md5",
    "sha1",
    "crypto-js",
  ]

  for (const pkg of insecurePackages) {
    if (dependencies[pkg]) {
      audit.fail(`${pkg} found`, "Use bcryptjs or crypto instead")
    }
  }

  audit.summary()
  return audit.failed === 0
}

/**
 * Run all security checks
 */
export async function runSecurityAudit() {
  console.log("\n" + "=".repeat(50))
  console.log("EvCRM Security Audit")
  console.log("=".repeat(50))

  const results = {
    envVars: await checkEnvironmentVariables(),
    committedSecrets: await checkForCommittedSecrets(),
    securityFiles: await checkSecurityFiles(),
    gitIgnore: await checkGitIgnore(),
    apiRoutes: await checkAPIRoutes(),
    dependencies: await checkDependencies(),
  }

  const allPassed = Object.values(results).every(r => r === true)

  console.log(`\n${colors.blue}Overall Result:${colors.reset}`)
  if (allPassed) {
    console.log(`${colors.green}✓ All security checks passed!${colors.reset}`)
  } else {
    console.log(`${colors.red}✗ Some security checks failed. Please review above.${colors.reset}`)
  }

  console.log("\n" + "=".repeat(50) + "\n")

  return allPassed
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runSecurityAudit().then(success => {
    process.exit(success ? 0 : 1)
  })
}

export default runSecurityAudit
