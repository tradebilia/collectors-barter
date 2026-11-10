import React, { useState, type ImgHTMLAttributes } from 'react';

type SafeImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'onError'> & {
  src?: string | null;
  unavailableLabel?: string;
};

/** Expired marketplace links get an explicit display-only placeholder. */
export function TestAiSafeImage({ src, ...props }: SafeImageProps) {
  if (!src) return null;
  // A new URL gets a different component and DOM image node. An error queued
  // for the old request cannot update the replacement instance's state.
  return <SourceKeyedImage key={src} src={src} {...props} />;
}

function SourceKeyedImage({ src, alt = '', className = '', unavailableLabel = 'Image unavailable', ...rest }:
  Omit<SafeImageProps, 'src'> & { src: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return <span role="img" aria-label={alt ? `${alt} (${unavailableLabel.toLowerCase()})` : unavailableLabel}
      data-image-unavailable="true"
      className={`${className} flex items-center justify-center border border-gray-700 bg-gray-950 text-center text-[7px] leading-tight text-gray-500`}>{unavailableLabel}</span>;
  }
  return <img {...rest} src={src} alt={alt} className={className} onError={() => setFailed(true)} />;
}
