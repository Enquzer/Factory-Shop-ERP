import * as fabric from 'fabric';

/**
 * Enables "Edit Mode" for a selected path or polygon.
 * Allows dragging individual control points (nodes).
 */
export function enablePathEditing(canvas: any, pathObject: any) {
  // If object is not a path or polygon, ignore
  if (pathObject.type !== 'path' && pathObject.type !== 'polygon' && pathObject.type !== 'polyline') return;

  // 1. Deselect object to prevet default bounding box controls
  canvas.discardActiveObject();
  
  // 2. We need to create "Control handles" for each point in the path.
  // Fabric.js v6+ generic ways to get points:
  // For Path: pathObject.path (array of commands)
  // For Poly: pathObject.points (array of objects)

  // This is a simplified implementation for Polygon editing.
  // Full Bezier editing is significantly more complex (requires 2 control points per node).
  
  if (pathObject.type === 'polygon' || pathObject.type === 'polyline') {
      editPolygon(canvas, pathObject);
  }
}

function editPolygon(canvas: any, poly: any) {
    canvas.setActiveObject(poly);
    
    // We can use the 'controls' API of Fabric.js to add custom controls for each point.
    // However, the number of points is dynamic.
    // A common "hack" or pattern in Fabric is to render small circles at each point
    // and bind their movement to the polygon's points.
    
    const points = poly.points;
    const matrix = poly.calcTransformMatrix();
    const controls: any = {};
    
    points.forEach((point: any, index: number) => {
        // We can dynamically add controls to the object
        // This is the native Fabric way for v4+, robust for v6/v7 too if API matches
        controls[`p${index}`] = new fabric.Control({
            position: { x: 0, y: 0 }, // Logic to position relative to object center? No, we need custom position handler.
            actionHandler: anchorWrapper(index > 0 ? index - 1 : points.length - 1, actionHandler), // wrapping logic
            actionName: 'modifyPolygon',
            // @ts-ignore
            pointIndex: index
        });
        
        // Override position handler to place control at the vertex
        controls[`p${index}`].positionHandler = function(dim: any, finalMatrix: any, fabricObject: any) {
            // calculated point position
             const x = (point.x - fabricObject.pathOffset.x),
                   y = (point.y - fabricObject.pathOffset.y);
             return fabric.util.transformPoint(
                 new fabric.Point(x, y),
                 fabric.util.multiplyTransformMatrices(
                     fabricObject.canvas.viewportTransform,
                     fabricObject.calcTransformMatrix()
                 )
             );
        };
    });
    
    poly.controls = controls;
    canvas.requestRenderAll();
}

// Handler to actually move the point when control is dragged
function actionHandler(eventData: any, transform: any, x: number, y: number) {
    const polygon = transform.target;
    const currentControl = polygon.controls[polygon.__corner];
    const mouseLocalPosition = polygon.toLocalPoint(new fabric.Point(x, y), 'center', 'center');
    const polygonBaseSize = polygon._getNonTransformedDimensions();
    const size = polygon._getTransformedDimensions(0, 0);
    const finalPointPosition = {
        x: mouseLocalPosition.x * polygonBaseSize.x / size.x + polygon.pathOffset.x,
        y: mouseLocalPosition.y * polygonBaseSize.y / size.y + polygon.pathOffset.y
    };
    
    polygon.points[currentControl.pointIndex] = finalPointPosition;
    return true;
}

function anchorWrapper(anchorIndex: number, fn: Function) {
  return function(eventData: any, transform: any, x: number, y: number) {
    const fabricObject = transform.target;
    // logic to handle point update
    // This is getting deep into Fabric internals.
    // For a robust CAD tool, we might want to use a state-based approach:
    // 1. Hide the original Polygon.
    // 2. Draw "Handles" (Circles) and "Lines" (Paths) manually on a separate layer.
    // 3. User drags Handles -> Update state -> Redraw Lines.
    // This is often more stable than hacking Fabric's internal Control API for dynamic points.
    
    return fn(eventData, transform, x, y);
  };
}
