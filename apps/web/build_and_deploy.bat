@echo off
echo Starting Fie Wura Android Build and Deployment Process
echo =======================================================
echo Log file: build_and_deploy.log
echo Current directory: %CD%
echo Target directory: C:\Users\eskgy\Documents\RedWavesTech\APPLICATIONS\Fiewura\apps\web

cd /d "C:\Users\eskgy\Documents\RedWavesTech\APPLICATIONS\Fiewura\apps\web"
echo Changed to: %CD%
echo. >> build_and_deploy.log
echo [%DATE% %TIME%] Starting build process >> build_and_deploy.log

echo Step 1: Installing Dependencies...
echo [%DATE% %TIME%] Installing dependencies... >> build_and_deploy.log
npm install >> build_and_deploy.log 2>&1
if %errorlevel% neq 0 (
    echo Error: Failed to install dependencies
    echo [%DATE% %TIME%] ERROR: npm install failed (exit code %errorlevel%) >> build_and_deploy.log
    pause
    exit /b 1
)
echo [%DATE% %TIME%] Dependencies installed successfully >> build_and_deploy.log

echo Step 2: Initializing Capacitor...
echo [%DATE% %TIME%] Initializing Capacitor... >> build_and_deploy.log
npx cap init >> build_and_deploy.log 2>&1
if %errorlevel% neq 0 (
    echo Error: Failed to initialize Capacitor
    echo [%DATE% %TIME%] ERROR: npx cap init failed (exit code %errorlevel%) >> build_and_deploy.log
    pause
    exit /b 1
)
echo [%DATE% %TIME%] Capacitor initialized successfully >> build_and_deploy.log

echo Step 3: Adding Android Platform...
echo [%DATE% %TIME%] Adding Android platform... >> build_and_deploy.log
npx cap add android >> build_and_deploy.log 2>&1
if %errorlevel% neq 0 (
    echo Error: Failed to add Android platform
    echo [%DATE% %TIME%] ERROR: npx cap add android failed (exit code %errorlevel%) >> build_and_deploy.log
    pause
    exit /b 1
)
echo [%DATE% %TIME%] Android platform added successfully >> build_and_deploy.log

echo Step 4: Building Web App...
echo [%DATE% %TIME%] Building web app... >> build_and_deploy.log
npm run build >> build_and_deploy.log 2>&1
if %errorlevel% neq 0 (
    echo Error: Failed to build web app
    echo [%DATE% %TIME%] ERROR: npm run build failed (exit code %errorlevel%) >> build_and_deploy.log
    pause
    exit /b 1
)
echo [%DATE% %TIME%] Web app built successfully >> build_and_deploy.log

echo Step 5: Syncing with Capacitor...
echo [%DATE% %TIME%] Syncing with Capacitor... >> build_and_deploy.log
npx cap sync >> build_and_deploy.log 2>&1
if %errorlevel% neq 0 (
    echo Error: Failed to sync with Capacitor
    echo [%DATE% %TIME%] ERROR: npx cap sync failed (exit code %errorlevel%) >> build_and_deploy.log
    pause
    exit /b 1
)
echo [%DATE% %TIME%] Synced with Capacitor successfully >> build_and_deploy.log

echo Step 6: Building Android APK...
echo [%DATE% %TIME%] Building Android APK... >> build_and_deploy.log
echo Note: This will open Android Studio. Build the APK manually, then press any key to continue...
npx cap build android >> build_and_deploy.log 2>&1
pause
echo [%DATE% %TIME%] Android Studio opened for manual APK build >> build_and_deploy.log

echo Step 7: Deploying to Android Device...
echo [%DATE% %TIME%] Deploying APK to device... >> build_and_deploy.log
adb install android\app\build\outputs\apk\debug\app-debug.apk >> build_and_deploy.log 2>&1
if %errorlevel% neq 0 (
    echo Error: Failed to deploy to device. Make sure device is connected and APK exists.
    echo [%DATE% %TIME%] ERROR: adb install failed (exit code %errorlevel%) >> build_and_deploy.log
    pause
    exit /b 1
)
echo [%DATE% %TIME%] APK deployed successfully to device >> build_and_deploy.log

echo [%DATE% %TIME%] Build and deployment process completed successfully >> build_and_deploy.log
echo Deployment Complete! Fie Wura should now be installed on your device.
pause