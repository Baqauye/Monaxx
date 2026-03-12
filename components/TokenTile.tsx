import React, { useState, useEffect } from 'react';
import { Token, Mood } from '../types';

interface TokenTileProps {
  token: Token;
  width: number;
  height: number;
  mood: Mood;
  onClick: (token: Token) => void;
  dimmed: boolean;
  onHover: (hovering: boolean) => void;
}

/**
 * Why: fixed formatting keeps numbers readable across tiny and large treemap tiles.
 */
const formatPrice = (price: number): string => {
  if (price < 0.0001) return price.toFixed(4);
  if (price < 1) return price.toFixed(4);
  if (price < 1000) return price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return price.toLocaleString(undefined, { maximumFractionDigits: 0 });
};

/**
 * Why: percent precision scales down for bigger values to avoid visual noise.
 */
const formatChange = (change: number): string => {
  const abs = Math.abs(change);
  if (abs >= 10) return abs.toFixed(2);
  return abs.toFixed(2);
};

const TokenTile: React.FC<TokenTileProps> = ({ token, width, height, mood, onClick, dimmed, onHover }) => {
  const [currentImgSrc, setCurrentImgSrc] = useState<string | undefined>(token.imageUrl);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setCurrentImgSrc(token.imageUrl);
    setImageError(false);
  }, [token.imageUrl]);

  const handleImageError = (): void => {
    if (currentImgSrc === token.imageUrl && token.backupImageUrl) {
      setCurrentImgSrc(token.backupImageUrl);
      return;
    }

    setImageError(true);
  };

  const isPositive = token.change24h >= 0;
  const area = width * height;
  const isTiny = area < 2400;
  const isSmall = area >= 2400 && area < 7000;
  const isMedium = area >= 7000 && area < 17000;
  const isLarge = area >= 17000 && area < 34000;
  const isXLarge = area >= 34000;

  const colorStrength = Math.min(Math.abs(token.change24h), 15) / 15;
  const positiveBase = mood === 'Playful' ? [24, 170, 84] : [34, 197, 94];
  const negativeBase = mood === 'Playful' ? [239, 68, 68] : [220, 38, 38];
  const base = isPositive ? positiveBase : negativeBase;
  const lift = Math.round(22 * colorStrength);
  const background = `rgb(${Math.min(base[0] + lift, 255)} ${Math.min(base[1] + lift, 255)} ${Math.min(base[2] + lift, 255)})`;

  const iconSize = isTiny ? 0 : isSmall ? 18 : isMedium ? 24 : isLarge ? 34 : 44;
  const symbolSize = isTiny ? 11 : isSmall ? 18 : isMedium ? 24 : isLarge ? 36 : 68;
  const priceSize = isTiny ? 0 : isSmall ? 11 : isMedium ? 14 : isLarge ? 26 : 64;
  const changeSize = isTiny ? 0 : isSmall ? 10 : isMedium ? 12 : isLarge ? 20 : 56;
  const domSize = isXLarge ? 48 : isLarge ? 17 : 0;

  const shouldShowImage = !isTiny && Boolean(currentImgSrc || imageError);

  return (
    <div
      style={{ width, height, opacity: dimmed ? 0.32 : 1, transition: 'opacity 180ms ease' }}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      onClick={() => onClick(token)}
    >
      <div
        style={{
          width: '100%',
          height: '100%',
          borderRadius: 12,
          border: '1px solid rgba(10, 18, 42, 0.55)',
          background,
          cursor: 'pointer',
          overflow: 'hidden',
          color: '#f8fafc',
          padding: isTiny ? 6 : isSmall ? 8 : 12,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: isXLarge ? 6 : 3,
          boxSizing: 'border-box',
          textShadow: '0 1px 8px rgba(0, 0, 0, 0.28)',
          position: 'relative',
        }}
      >
        {shouldShowImage && (
          currentImgSrc && !imageError ? (
            <img
              src={currentImgSrc}
              alt={token.symbol}
              style={{
                width: iconSize,
                height: iconSize,
                borderRadius: '50%',
                objectFit: 'cover',
                border: '2px solid rgba(255,255,255,0.32)',
                backgroundColor: 'rgba(255,255,255,0.08)',
              }}
              onError={handleImageError}
            />
          ) : (
            <div
              style={{
                width: iconSize,
                height: iconSize,
                borderRadius: '50%',
                backgroundColor: 'rgba(255,255,255,0.14)',
                border: '2px solid rgba(255,255,255,0.28)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: Math.max(Math.round(iconSize * 0.45), 10),
              }}
            >
              {token.symbol.slice(0, 1)}
            </div>
          )
        )}

        <div style={{ fontSize: symbolSize, fontWeight: 800, lineHeight: 1, letterSpacing: '0.02em' }}>{token.symbol}</div>
        {!isTiny && <div style={{ fontSize: priceSize, fontWeight: 700, lineHeight: 1.05 }}>${formatPrice(token.price)}</div>}
        {!isTiny && (
          <div style={{ fontSize: changeSize, fontWeight: 700, lineHeight: 1.05 }}>
            {isPositive ? '+' : '-'}{formatChange(token.change24h)}%
          </div>
        )}

        {domSize > 0 && (
          <div style={{ fontSize: domSize, marginTop: isXLarge ? 6 : 2, fontWeight: 700, opacity: 0.9 }}>
            Dom.: {token.dominance.toFixed(2)}%
          </div>
        )}
      </div>
    </div>
  );
};

export default TokenTile;
