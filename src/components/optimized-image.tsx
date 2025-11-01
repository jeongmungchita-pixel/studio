'use client';
import { useState, useCallback } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { ImageIcon, Loader2 } from 'lucide-react';
interface OptimizedImageProps {
  src?: string | null;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  fallbackType?: 'avatar' | 'placeholder' | 'custom';
  fallbackSrc?: string;
  priority?: boolean;
  quality?: number;
  sizes?: string;
  fill?: boolean;
  objectFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';
  loading?: 'lazy' | 'eager';
  placeholder?: 'blur' | 'empty';
  blurDataURL?: string;
}
// Firebase Storage URL을 리사이징된 URL로 변환
function getOptimizedFirebaseUrl(url: string, width: number, height: number): string {
  // Firebase Storage URL 패턴 감지
  if (url.includes('firebasestorage.googleapis.com') || url.includes('storage.googleapis.com')) {
    // Firebase Storage의 이미지 리사이징 기능 활용
    // 예: ?alt=media&token=xxx → ?alt=media&token=xxx&w=200&h=200
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}w=${width}&h=${height}&fit=crop`;
  }
  // Picsum 이미지 최적화
  if (url.includes('picsum.photos')) {
    // 기존 크기를 새로운 크기로 교체
    return url.replace(/\/\d+\/\d+/, `/${width}/${height}`);
  }
  return url;
}
// 기본 아바타 생성 (사용자 ID 기반)
function generateAvatarUrl(seed: string, width: number, height: number): string {
  return `https://picsum.photos/seed/${seed}/${width}/${height}`;
}
export function OptimizedImage({
  src,
  alt,
  width = 40,
  height = 40,
  className,
  fallbackType = 'avatar',
  fallbackSrc,
  priority = false,
  quality = 75,
  sizes,
  fill = false,
  objectFit = 'cover',
  loading = 'lazy',
  placeholder = 'empty',
  blurDataURL,
}: OptimizedImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  // 이미지 로드 완료 핸들러
  const handleLoad = useCallback(() => {
    setIsLoading(false);
    setHasError(false);
  }, []);
  // 이미지 로드 에러 핸들러
  const handleError = useCallback(() => {
    setIsLoading(false);
    setHasError(true);
  }, []);
  // 최적화된 이미지 URL 생성
  const optimizedSrc = src ? getOptimizedFirebaseUrl(src, width, height) : null;
  // Fallback 이미지 결정
  const getFallbackSrc = (): string => {
    if (fallbackSrc) return fallbackSrc;
    switch (fallbackType) {
      case 'avatar':
        // alt 텍스트나 랜덤 시드로 아바타 생성
        const seed = alt.replace(/\s+/g, '').toLowerCase() || 'default';
        return generateAvatarUrl(seed, width, height);
      case 'placeholder':
        return `data:image/svg+xml;base64,${btoa(`
          <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
            <rect width="100%" height="100%" fill="#f3f4f6"/>
            <text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="#9ca3af" font-size="12">
              ${alt.charAt(0).toUpperCase()}
            </text>
          </svg>
        `)}`;
      default:
        return generateAvatarUrl('default', width, height);
    }
  };
  // 실제 표시할 이미지 URL
  const displaySrc = hasError || !optimizedSrc ? getFallbackSrc() : optimizedSrc;
  // 컨테이너 스타일
  const containerClassName = cn(
    'relative overflow-hidden bg-muted',
    fill ? 'w-full h-full' : '',
    className
  );
  // 이미지 스타일
  const imageClassName = cn(
    'transition-opacity duration-300',
    isLoading ? 'opacity-0' : 'opacity-100',
    objectFit === 'cover' ? 'object-cover' : '',
    objectFit === 'contain' ? 'object-contain' : '',
    objectFit === 'fill' ? 'object-fill' : '',
    objectFit === 'none' ? 'object-none' : '',
    objectFit === 'scale-down' ? 'object-scale-down' : ''
  );
  return (
    <div className={containerClassName}>
      {/* 로딩 상태 */}
      {isLoading && (
        <div 
          className="absolute inset-0 flex items-center justify-center bg-muted"
          style={{ width: fill ? '100%' : width, height: fill ? '100%' : height }}
        >
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      )}
      {/* 에러 상태 (아바타가 아닌 경우) */}
      {hasError && fallbackType !== 'avatar' && (
        <div 
          className="absolute inset-0 flex items-center justify-center bg-muted"
          style={{ width: fill ? '100%' : width, height: fill ? '100%' : height }}
        >
          <ImageIcon className="h-1/2 w-1/2 text-muted-foreground" />
        </div>
      )}
      {/* 실제 이미지 */}
      <Image
        src={displaySrc}
        alt={alt}
        width={fill ? undefined : width}
        height={fill ? undefined : height}
        fill={fill}
        className={imageClassName}
        priority={priority}
        quality={quality}
        sizes={sizes || (fill ? '100vw' : `${width}px`)}
        loading={loading}
        placeholder={placeholder}
        blurDataURL={blurDataURL}
        onLoad={handleLoad}
        onError={handleError}
        unoptimized={false} // Next.js 최적화 활성화
      />
    </div>
  );
}
// 프리셋 컴포넌트들
export function AvatarImage({
  src,
  alt,
  size = 40,
  className,
  ...props
}: Omit<OptimizedImageProps, 'width' | 'height' | 'fallbackType'> & {
  size?: number;
}) {
  return (
    <OptimizedImage
      src={src}
      alt={alt}
      width={size}
      height={size}
      className={cn('rounded-full', className)}
      fallbackType="avatar"
      quality={85} // 아바타는 높은 품질
      {...props}
    />
  );
}
export function ThumbnailImage({
  src,
  alt,
  width = 120,
  height = 120,
  className,
  ...props
}: OptimizedImageProps) {
  return (
    <OptimizedImage
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={cn('rounded-md', className)}
      fallbackType="placeholder"
      quality={60} // 썸네일은 낮은 품질로 최적화
      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
      {...props}
    />
  );
}
export function HeroImage({
  src,
  alt,
  className,
  ...props
}: Omit<OptimizedImageProps, 'fill'>) {
  return (
    <OptimizedImage
      src={src}
      alt={alt}
      fill
      className={className}
      fallbackType="placeholder"
      quality={90} // 히어로 이미지는 높은 품질
      priority // 히어로 이미지는 우선 로드
      sizes="100vw"
      {...props}
    />
  );
}
