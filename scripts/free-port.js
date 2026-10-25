/**
 * Nexus Platform - Cross-Platform Port Release Utility
 * Automatically identifies and terminates any stale/zombie processes holding specified ports
 * before starting dev servers, preventing EADDRINUSE errors.
 */

const { execSync } = require('child_process');
const os = require('os');

const isWindows = os.platform() === 'win32';

/**
 * Frees a specific TCP port by terminating the owning process.
 * @param {number} port
 */
function freePort(port) {
  if (!port || isNaN(port)) return;

  const currentPid = process.pid;

  try {
    if (isWindows) {
      // Find owning PID on Windows
      const netstatOutput = execSync(`netstat -ano -p tcp | findstr :${port}`, {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'ignore'],
      });

      const lines = netstatOutput.trim().split('\n');
      const pidsToKill = new Set();

      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        // Format: TCP    LocalAddr    ForeignAddr    State    PID
        if (parts.length >= 5 && parts[1].endsWith(`:${port}`) && parts[3] === 'LISTENING') {
          const pid = parseInt(parts[4], 10);
          if (pid && pid !== currentPid && pid !== 0 && pid !== 4) {
            pidsToKill.add(pid);
          }
        }
      }

      for (const pid of pidsToKill) {
        try {
          console.log(
            `🧹 [PORT CLEANER] Phát hiện tiến trình PID ${pid} đang chiếm cổng ${port}. Đang giải phóng...`,
          );
          execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' });
          console.log(`✅ [PORT CLEANER] Đã giải phóng cổng ${port} thành công!`);
        } catch {
          // Process might have already terminated
        }
      }
    } else {
      // Unix / macOS
      try {
        const pids = execSync(`lsof -ti tcp:${port}`, {
          encoding: 'utf-8',
          stdio: ['pipe', 'pipe', 'ignore'],
        })
          .trim()
          .split('\n')
          .filter(Boolean)
          .map((id) => parseInt(id, 10))
          .filter((id) => id && id !== currentPid);

        for (const pid of pids) {
          console.log(`🧹 [PORT CLEANER] Killing PID ${pid} holding port ${port}...`);
          execSync(`kill -9 ${pid}`, { stdio: 'ignore' });
        }
      } catch {
        // Port was not occupied
      }
    }
  } catch {
    // Port was not occupied (findstr exited with code 1)
  }
}

// Direct CLI execution: node scripts/free-port.js 3000 [4000 ...]
if (require.main === module) {
  const ports = process.argv
    .slice(2)
    .map((p) => parseInt(p, 10))
    .filter((p) => !isNaN(p));
  const targetPorts = ports.length > 0 ? ports : [3000];

  for (const port of targetPorts) {
    freePort(port);
  }
}

module.exports = { freePort };
