import React, { useRef, useEffect, useState } from 'react';

function Canvas({ socket, isDrawing: canDraw, roomId }) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentColor, setCurrentColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(5);
  const lastPos = useRef(null);

  const colors = [
    '#8B4513', // brown
    '#FFFFFF', // white
    '#808080', // gray
    '#FF0000', // red
    '#FFA500', // orange
    '#FFFF00', // yellow
    '#00FF00', // green
    '#00FFFF', // cyan
    '#0000FF', // blue
    '#800080', // purple
    '#FF69B4', // pink
    '#FFC0CB', // light pink
    '#A52A2A', // brown
  ];

  const brushSizes = [2, 5, 10, 15, 20];

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    
    // Set initial canvas style
    context.strokeStyle = currentColor;
    context.lineWidth = brushSize;
    context.lineCap = 'round';
    context.lineJoin = 'round';

    // Set canvas cursor style
    canvas.style.cursor = canDraw ? 'url(data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0Ij48cGF0aCBkPSJNNy4xMjcgMjIuNTYybC03LjEyNyAxLjQzOCAxLjQzOC03LjEyOCAxNS43NjItMTUuNzYyIDUuNjg5IDUuNjl6Ii8+PC9zdmc+) 0 24, auto' : 'default';

    if (socket) {
      socket.on('draw', ({ x, y, color, size, type }) => {
        if (type === 'start') {
          context.beginPath();
          context.moveTo(x, y);
        } else if (type === 'draw') {
          context.strokeStyle = color;
          context.lineWidth = size;
          context.lineTo(x, y);
          context.stroke();
        }
      });

      socket.on('clearCanvas', () => {
        context.clearRect(0, 0, canvas.width, canvas.height);
      });
    }

    return () => {
      if (socket) {
        socket.off('draw');
        socket.off('clearCanvas');
      }
    };
  }, [socket, currentColor, brushSize, canDraw]);

  const startDrawing = (e) => {
    if (!canDraw) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setIsDrawing(true);
    lastPos.current = { x, y };

    socket.emit('draw', {
      roomId,
      x,
      y,
      color: currentColor,
      size: brushSize,
      type: 'start'
    });
  };

  const draw = (e) => {
    if (!isDrawing || !canDraw) return;

    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    context.beginPath();
    context.moveTo(lastPos.current.x, lastPos.current.y);
    context.lineTo(x, y);
    context.strokeStyle = currentColor;
    context.lineWidth = brushSize;
    context.stroke();

    lastPos.current = { x, y };

    socket.emit('draw', {
      roomId,
      x,
      y,
      color: currentColor,
      size: brushSize,
      type: 'draw'
    });
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  return (
    <div className="canvas-container">
      <canvas
        ref={canvasRef}
        width={800}
        height={600}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseOut={stopDrawing}
      />
      {canDraw && (
        <div className="drawing-controls">
          <div className="color-palette">
            {colors.map((color) => (
              <button
                key={color}
                className={`color-option ${color === currentColor ? 'selected' : ''}`}
                style={{ backgroundColor: color }}
                onClick={() => setCurrentColor(color)}
              />
            ))}
          </div>
          <div className="brush-sizes">
            {brushSizes.map((size) => (
              <button
                key={size}
                className={`brush-size ${size === brushSize ? 'selected' : ''}`}
                onClick={() => setBrushSize(size)}
              >
                <div 
                  className="brush-preview" 
                  style={{ 
                    width: size, 
                    height: size, 
                    backgroundColor: currentColor 
                  }} 
                />
              </button>
            ))}
          </div>
          <button
            className="clear-canvas-btn"
            onClick={() => {
              if (!canvasRef.current) return;
              const context = canvasRef.current.getContext('2d');
              context.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
              socket.emit('clearCanvas', { roomId });
            }}
          >
            Clear Canvas
          </button>
        </div>
      )}
    </div>
  );
}

export default Canvas;
