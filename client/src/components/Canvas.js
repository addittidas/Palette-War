import React, { useRef, useEffect, useState } from 'react';

function Canvas({ socket, isDrawing: canDraw, roomId }) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentColor, setCurrentColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(5);
  const [isEraser, setIsEraser] = useState(false);
  const lastPos = useRef(null);

  const colors = [
    '#000000', // black
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

  // SVG cursors encoded in base64
  const penCursor = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0Ij48cGF0aCBkPSJNNy4xMjcgMjIuNTYybC03LjEyNyAxLjQzOCAxLjQzOC03LjEyOCAxNS43NjItMTUuNzYyIDUuNjg5IDUuNjl6Ii8+PC9zdmc+";
  
  const eraserCursor = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0Ij48cGF0aCBkPSJNMTYuMjQgMy41NkwxNC40NCAxLjc2QzEzLjg0IDEuMTYgMTMuMDQgMC44NiAxMi4yNCAwLjg2QzExLjQ0IDAuODYgMTAuNjQgMS4xNiAxMC4wNCAxLjc2TDguMDQgMy43NkwxOC4yNCAxMy45NkwyMC4yNCAxMS45NkMyMS40NCAxMC43NiAyMS40NCA4Ljc2IDIwLjI0IDcuNTZMMTYuMjQgMy41NlpNMTcuMDQgMTQuODZMNy4wNCA0Ljg2TDMuNDQgOC40NkMyLjI0IDkuNjYgMi4yNCAxMS42NiAzLjQ0IDEyLjg2TDcuNDQgMTYuODZDOC4wNCAxNy40NiA4Ljg0IDE3Ljc2IDkuNjQgMTcuNzZDMTAuNDQgMTcuNzYgMTEuMjQgMTcuNDYgMTEuODQgMTYuODZMMTcuMDQgMTQuODZaIiBmaWxsPSIjMDAwMDAwIi8+PC9zdmc+";

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    
    // Set initial canvas style
    context.strokeStyle = currentColor;
    context.lineWidth = brushSize;
    context.lineCap = 'round';
    context.lineJoin = 'round';

    // Set canvas cursor style based on tool
    if (canDraw) {
      const cursorUrl = isEraser ? eraserCursor : penCursor;
      canvas.style.cursor = `url(${cursorUrl}) 0 24, auto`;
    } else {
      canvas.style.cursor = 'default';
    }

    if (socket) {
      socket.on('draw', ({ x, y, color, size, type, isEraser }) => {
        if (type === 'start') {
          context.beginPath();
          context.moveTo(x, y);
        } else if (type === 'draw') {
          context.strokeStyle = isEraser ? '#FFFFFF' : color;
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
  }, [socket, currentColor, brushSize, canDraw, isEraser]);

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
      type: 'start',
      isEraser
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
    context.strokeStyle = isEraser ? '#FFFFFF' : currentColor;
    context.lineWidth = brushSize;
    context.stroke();

    lastPos.current = { x, y };

    socket.emit('draw', {
      roomId,
      x,
      y,
      color: currentColor,
      size: brushSize,
      type: 'draw',
      isEraser
    });
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const toggleEraser = () => {
    setIsEraser(!isEraser);
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
                className={`color-option ${color === currentColor && !isEraser ? 'selected' : ''}`}
                style={{ backgroundColor: color }}
                onClick={() => {
                  setCurrentColor(color);
                  setIsEraser(false);
                }}
              />
            ))}
            <button
              className={`eraser-option ${isEraser ? 'selected' : ''}`}
              onClick={toggleEraser}
            >
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path d="M16.24 3.56L14.44 1.76C13.84 1.16 13.04 0.86 12.24 0.86C11.44 0.86 10.64 1.16 10.04 1.76L8.04 3.76L18.24 13.96L20.24 11.96C21.44 10.76 21.44 8.76 20.24 7.56L16.24 3.56ZM17.04 14.86L7.04 4.86L3.44 8.46C2.24 9.66 2.24 11.66 3.44 12.86L7.44 16.86C8.04 17.46 8.84 17.76 9.64 17.76C10.44 17.76 11.24 17.46 11.84 16.86L17.04 14.86Z" 
                fill={isEraser ? '#333' : '#666'}/>
              </svg>
            </button>
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
                    backgroundColor: isEraser ? '#FFFFFF' : currentColor 
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
