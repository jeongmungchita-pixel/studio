import type {NextConfig} from 'next';
// @ts-ignore
import withPWA from 'next-pwa';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    // 이미지 최적화 설정
    formats: ['image/webp', 'image/avif'], // 최신 이미지 포맷 우선 사용
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840], // 반응형 이미지 크기
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384], // 고정 크기 이미지
    minimumCacheTTL: 60 * 60 * 24 * 7, // 7일 캐시
    dangerouslyAllowSVG: true, // SVG 허용
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;", // SVG 보안
    
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'storage.googleapis.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com', // Google 프로필 이미지
        port: '',
        pathname: '/**',
      }
    ],
    
    // 이미지 로더 설정 (선택사항)
    loader: 'default'
  },
};

export default withPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
})(nextConfig);
