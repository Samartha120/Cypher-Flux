const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const COLORS = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  cyan: "\x1b[36m",
  yellow: "\x1b[33m",
  bold: "\x1b[1m"
};

const TICK = process.platform === 'win32' ? '√' : '✔';
const CROSS = process.platform === 'win32' ? 'x' : '✘';

function getAllFiles(dirPath, arrayOfFiles) {
  if (!fs.existsSync(dirPath)) return arrayOfFiles || [];
  const files = fs.readdirSync(dirPath);

  arrayOfFiles = arrayOfFiles || [];

  files.forEach(function(file) {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (!['node_modules', '.git', 'instance', '__pycache__', 'dist', 'build', 'assests'].includes(file)) {
        arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
      }
    } else {
      const ext = path.extname(file);
      if (['.js', '.jsx', '.py', '.css', '.html'].includes(ext)) {
        arrayOfFiles.push(fullPath);
      }
    }
  });

  return arrayOfFiles;
}

function runTests() {
  const rootDir = path.resolve(__dirname, '..');
  const frontendDir = path.join(rootDir, 'cypherflux-frontend', 'src');
  const backendAppDir = path.join(rootDir, 'cypherflux-backend', 'app');
  const backendRootDir = path.join(rootDir, 'cypherflux-backend');

  console.log(`${COLORS.bold}${COLORS.cyan}=========================================`);
  console.log(`       CYPHER-FLUX TEST RUNNER           `);
  console.log(`=========================================${COLORS.reset}\n`);

  // 1. INTEGRITY CHECKS
  console.log(`${COLORS.bold}${COLORS.yellow}PHASE 1: SYSTEM INTEGRITY CHECK${COLORS.reset}`);
  console.log(`-----------------------------------------`);
  
  // Frontend Integrity
  let frontendFiles = getAllFiles(frontendDir);
  let frontendPassed = 0;
  frontendFiles.forEach(file => {
    const relativePath = path.relative(rootDir, file);
    const stats = fs.statSync(file);
    if (stats.size > 0) {
      frontendPassed++;
    } else {
      console.log(`${COLORS.red}${CROSS} FAILED:${COLORS.reset} ${relativePath} (Empty file)`);
    }
  });
  console.log(`${COLORS.green}${TICK} Frontend Integrity:${COLORS.reset} ${frontendPassed}/${frontendFiles.length} files verified`);

  // Backend Integrity
  let backendFiles = getAllFiles(backendAppDir);
  let backendPassed = 0;
  backendFiles.forEach(file => {
    const relativePath = path.relative(rootDir, file);
    const stats = fs.statSync(file);
    if (stats.size > 0) {
      backendPassed++;
    } else {
      console.log(`${COLORS.red}${CROSS} FAILED:${COLORS.reset} ${relativePath} (Empty file)`);
    }
  });
  console.log(`${COLORS.green}${TICK} Backend Integrity:${COLORS.reset} ${backendPassed}/${backendFiles.length} files verified\n`);

  // 2. FUNCTIONAL LOGIC TESTS
  console.log(`${COLORS.bold}${COLORS.yellow}PHASE 2: FUNCTIONAL LOGIC TESTS${COLORS.reset}`);
  console.log(`-----------------------------------------`);

  const rootBackendFiles = fs.readdirSync(backendRootDir).filter(f => f.startsWith('test_') && f.endsWith('.py'));
  let logicPassed = 0;

  rootBackendFiles.forEach(file => {
    const fullPath = path.join(backendRootDir, file);
    const relativePath = path.relative(rootDir, fullPath);
    
    process.stdout.write(`Running logic test: ${relativePath}... `);
    try {
      // Execute the python test script
      execSync(`python "${fullPath}"`, { stdio: 'ignore', cwd: backendRootDir });
      console.log(`${COLORS.green}${TICK} PASSED${COLORS.reset}`);
      logicPassed++;
    } catch (error) {
      console.log(`${COLORS.red}${CROSS} FAILED${COLORS.reset}`);
    }
  });

  console.log(`\n${COLORS.bold}Logic Summary:${COLORS.reset}`);
  console.log(`Total Functional Tests: ${rootBackendFiles.length}`);
  console.log(`Passed: ${COLORS.green}${logicPassed}${COLORS.reset}`);
  console.log(`Failed: ${COLORS.red}${rootBackendFiles.length - logicPassed}${COLORS.reset}`);
  console.log(`-----------------------------------------\n`);

  const totalIntegrity = frontendFiles.length + backendFiles.length;
  const passedIntegrity = frontendPassed + backendPassed;
  const totalLogic = rootBackendFiles.length;

  console.log(`${COLORS.bold}${COLORS.cyan}=========================================`);
  console.log(`INTEGRITY: ${passedIntegrity}/${totalIntegrity} PASSED`);
  console.log(`LOGIC:     ${logicPassed}/${totalLogic} PASSED`);
  console.log(`OVERALL:   ${passedIntegrity === totalIntegrity && logicPassed === totalLogic ? 'SUCCESS' : 'FAILURE'}`);
  console.log(`=========================================${COLORS.reset}`);

  if (passedIntegrity === totalIntegrity && logicPassed === totalLogic) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runTests();
