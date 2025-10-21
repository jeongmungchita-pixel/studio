#!/usr/bin/env python3
import os, subprocess, sys
os.environ.setdefault('BEFS_CONSOLE_URL','http://127.0.0.1:8780')
subprocess.run([sys.executable,'-m','befs_automation.cli','start'])
