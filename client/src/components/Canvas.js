import React, { useEffect, useRef, forwardRef } from 'react';

const Canvas = forwardRef(({ isDrawing, socket, roomId }, ref) => {
  const isDrawingRef = useRef(false);
  const prevPoint = useRef(null);

  useEffect(() => {
    if (!ref.current) return;

    const canvas = ref.current;
    const context = canvas.getContext('2d');

    // Set canvas size
    canvas.width = 800;
    canvas.height = 600;

    // Set drawing styles
    context.strokeStyle = '#000000';
    context.lineWidth = 2;
    context.lineCap = 'round';
    context.lineJoin = 'round';

    const draw = (e) => {
      if (!isDrawingRef.current) return;

      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      context.beginPath();
      context.moveTo(prevPoint.current.x, prevPoint.current.y);
      context.lineTo(x, y);
      context.stroke();

      socket.emit('draw', {
        roomId,
        drawData: {
          x0: prevPoint.current.x,
          y0: prevPoint.current.y,
          x1: x,
          y1: y
        }
      });

      prevPoint.current = { x, y };
    };

    const startDrawing = (e) => {
      if (!isDrawing) return;

      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      isDrawingRef.current = true;
      prevPoint.current = { x, y };
    };

    const stopDrawing = () => {
      isDrawingRef.current = false;
      prevPoint.current = null;
    };

    // Handle drawing events
    socket.on('drawing', (drawData) => {
      const { x0, y0, x1, y1 } = drawData;
      context.beginPath();
      context.moveTo(x0, y0);
      context.lineTo(x1, y1);
      context.stroke();
    });

    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseleave', stopDrawing);

    return () => {
      socket.off('drawing');
      canvas.removeEventListener('mousedown', startDrawing);
      canvas.removeEventListener('mousemove', draw);
      canvas.removeEventListener('mouseup', stopDrawing);
      canvas.removeEventListener('mouseleave', stopDrawing);
    };
  }, [isDrawing, socket, roomId, ref]);

  return (
    <div className="canvas-container">
      <canvas
        ref={ref}
        className="drawing-canvas"
      />
      {isDrawing && (
        <button
          className="clear-canvas-btn"
          onClick={() => {
            if (!ref.current) return;
            const context = ref.current.getContext('2d');
            context.clearRect(0, 0, ref.current.width, ref.current.height);
            socket.emit('clearCanvas', { roomId });
          }}
        >
          Clear Canvas
        </button>
      )}
    </div>
  );
});

export default Canvas;
