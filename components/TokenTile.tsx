// components/TokenTile.tsx
import React, { useState, useEffect, useRef } from 'react';
import { Token, Mood } from '../types';
import { formatCompactNumber } from '../utils';

interface TokenTileProps {
  token: Token;
  width: number;
  height: number;
  mood: Mood;
  onClick: (token: Token) => void;
  dimmed: boolean;
  onHover: (hovering: boolean) => void;
}

const TokenTile: React.FC<TokenTileProps> = ({ token, width, height, mood, onClick, dimmed, onHover }) => {
  const [currentImgSrc, setCurrentImgSrc] = useState<string | undefined>(token.imageUrl);
  const [imageError, setImageError] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCurrentImgSrc(token.imageUrl);
    setImageError(false);
  }, [token.imageUrl]);

  const handleImageError = () => {
    if (currentImgSrc === token.imageUrl && token.backupImageUrl) {
      setCurrentImgSrc(token.backupImageUrl);
    } else {
      setImageError(true);
    }
  };

  // Ensure change24h is a number for comparison
  const change24hNum = parseFloat(token.change24h?.toString() || '0');
  const isPositive = change24hNum >= 0;

  // Define colors based on mood
  const bgColor = isPositive
    ? (mood === 'Playful' ? '#f0fdf4' : '#34d399') // Light green / Bright green
    : (mood === 'Playful' ? '#fef2f2' : '#f87171'); // Light red / Bright red

  const textColor = isPositive
    ? (mood === 'Playful' ? '#064e3b' : '#f0fdf4') // Dark green / White
    : (mood === 'Playful' ? '#991b1b' : '#fff0f2'); // Dark red / Light red

  // Calculate font size based on tile size
  const fontSize = Math.min(width / 5, height / 4, 24);
  const smallFontSize = Math.max(fontSize * 0.6, 10);
  const showText = width > 40 && height > 40;
  const showDetail = width > 80 && height > 60;
  const imgSize = Math.min(width * 0.4, height * 0.4, 60);
  const showImage = width > 50 && height > 50;

  const handleMouseEnter = () => {
    onHover(true);
  };

  const handleMouseLeave = () => {
    onHover(false);
  };

  return (
    <div
      ref={containerRef}
      onClick={() => onClick(token)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        width: `${width}px`,
        height: `${height}px`,
        backgroundColor: bgColor,
        color: textColor,
        opacity: dimmed ? 0.3 : 1,
        filter: dimmed ? 'grayscale(0.6) blur(1px)' : 'none',
        transform: dimmed ? 'scale(0.95)' : 'scale(1)',
        zIndex: dimmed ? 1 : 20,
        transition: 'all 0.4s cubic-bezier(0.2, 0.8, 0.2, 1)',
        cursor: 'pointer',
        borderRadius: mood === 'Playful' ? '16px' : '2px',
        border: mood === 'Playful' ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(255,255,255,0.05)',
        backdropFilter: mood === 'Playful' ? 'blur(10px)' : 'blur(4px)',
        display: 'flex',
        flexDirection: 'column' as const,
        justifyContent: 'center',
        alignItems: 'center',
        padding: mood === 'Playful' ? '8px' : '4px',
        boxSizing: 'border-box' as const,
        overflow: 'hidden',
      }}
      className={`relative overflow-hidden cursor-pointer shadow-sm ${mood === 'Playful' ? 'rounded-2xl border-4 border-white/20' : 'rounded-none border border-black/10'} flex flex-col items-center justify-center text-center p-1`}
    >
      {showImage && currentImgSrc && !imageError && (
        <img
          src={currentImgSrc}
          alt={token.name}
          style={{
            width: `${imgSize}px`,
            height: `${imgSize}px`,
            borderRadius: '50%',
            objectFit: 'cover',
            marginBottom: '4px',
          }}
          onError={handleImageError}
        />
      )}
      {showText && (
        <div style={{ textAlign: 'center', width: '100%' }}>
          <div
            style={{
              fontSize: `${fontSize}px`,
              fontWeight: 'bold' as const,
              whiteSpace: 'nowrap' as const,
              overflow: 'hidden' as const,
              textOverflow: 'ellipsis' as const,
              marginBottom: '2px',
            }}
          >
            {token.symbol}
          </div>
          {showDetail && (
            <>
              <div
                style={{
                  fontSize: `${smallFontSize}px`,
                  whiteSpace: 'nowrap' as const,
                  overflow: 'hidden' as const,
                  textOverflow: 'ellipsis' as const,
                  marginBottom: '2px',
                }}
              >
                {token.name}
              </div>
              <div
                style={{
                  fontSize: `${smallFontSize}px`,
                  fontWeight: 'bold' as const,
                  whiteSpace: 'nowrap' as const,
                  overflow: 'hidden' as const,
                  textOverflow: 'ellipsis' as const,
                  marginBottom: '2px',
                }}
              >
                ${token.price.toFixed(4)} {/* Format price to 4 decimal places */}
              </div>
              <div
                style={{
                  fontSize: `${smallFontSize}px`,
                  fontWeight: 'bold' as const,
                  whiteSpace: 'nowrap' as const,
                  overflow: 'hidden' as const,
                  textOverflow: 'ellipsis' as const,
                }}
              >
                {isPositive ? '+' : ''}{change24hNum.toFixed(2)}% {/* Use the number version for formatting */}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default TokenTile;
