/**
 * 배포 설정 파일
 * 다양한 환경에 대한 배포 구성
 */

const deployConfig = {
  // 개발 환경
  development: {
    name: 'Development',
    url: 'http://localhost:3000',
    env: {
      NODE_ENV: 'development',
      NEXT_PUBLIC_DEBUG_MODE: 'true',
    },
  },

  // 스테이징 환경
  staging: {
    name: 'Staging',
    url: 'https://staging.kgf-nexus.com',
    env: {
      NODE_ENV: 'production',
      NEXT_PUBLIC_DEBUG_MODE: 'true',
    },
    build: {
      command: 'npm run build',
      output: '.next',
    },
  },

  // 프로덕션 환경
  production: {
    name: 'Production',
    url: 'https://kgf-nexus.com',
    env: {
      NODE_ENV: 'production',
      NEXT_PUBLIC_DEBUG_MODE: 'false',
    },
    build: {
      command: 'npm run build',
      output: '.next',
    },
    optimization: {
      minify: true,
      compress: true,
      removeConsole: true,
      bundleAnalyzer: false,
    },
  },

  // Vercel 배포 설정
  vercel: {
    framework: 'nextjs',
    buildCommand: 'npm run build',
    outputDirectory: '.next',
    installCommand: 'npm install',
    devCommand: 'npm run dev',
    regions: ['icn1'], // 서울 리전
    functions: {
      'api/users/route.ts': {
        maxDuration: 30,
      },
      'api/users/[id]/route.ts': {
        maxDuration: 30,
      },
    },
  },

  // Firebase Hosting 설정
  firebase: {
    hosting: {
      public: 'out',
      ignore: [
        'firebase.json',
        '**/.*',
        '**/node_modules/**',
      ],
      rewrites: [
        {
          source: '**',
          destination: '/index.html',
        },
      ],
      headers: [
        {
          source: '**/*.@(jpg|jpeg|gif|png|svg|webp|avif)',
          headers: [
            {
              key: 'Cache-Control',
              value: 'public, max-age=31536000, immutable',
            },
          ],
        },
        {
          source: '**/*.@(js|css)',
          headers: [
            {
              key: 'Cache-Control',
              value: 'public, max-age=31536000, immutable',
            },
          ],
        },
      ],
    },
  },
};

module.exports = deployConfig;
