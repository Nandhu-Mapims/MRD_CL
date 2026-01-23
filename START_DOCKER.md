# How to Start Docker Desktop

## Issue
Docker Desktop is installed but the **Docker daemon is not running**.

The error `failed to connect to the docker API at npipe:////./pipe/dockerDesktopLinuxEngine` means Docker Desktop needs to be started.

## Solution

### Method 1: Start from Windows Start Menu
1. Press `Windows Key`
2. Type "Docker Desktop"
3. Click on "Docker Desktop" application
4. Wait for Docker Desktop to start (whale icon in system tray)

### Method 2: Start from Command Line
```powershell
# Start Docker Desktop
Start-Process "C:\Program Files\Docker\Docker\Docker Desktop.exe"
```

### Method 3: Check if it's already running
```powershell
# Check if Docker Desktop process is running
Get-Process "Docker Desktop" -ErrorAction SilentlyContinue
```

## Verify Docker is Running

After starting Docker Desktop, wait 30-60 seconds, then verify:

```powershell
docker info
```

You should see:
```
Server:
 Containers: 0
  Running: 0
  Paused: 0
  Stopped: 0
 Images: 0
 Server Version: ...
```

If you see "Server Version", Docker is ready!

## Then Run Your Command

Once Docker is running:

```powershell
docker compose up -d --build
```

## Troubleshooting

### If Docker Desktop won't start:
1. Check Windows Services:
   - Press `Win + R`, type `services.msc`
   - Look for "Docker Desktop Service"
   - Right-click → Start

2. Restart Docker Desktop:
   - Right-click Docker icon in system tray
   - Click "Restart Docker Desktop"

3. Check Docker Desktop logs:
   - Open Docker Desktop
   - Go to Troubleshoot → View logs
