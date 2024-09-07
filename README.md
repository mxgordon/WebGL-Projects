# WebGL Projects

To run any of these projects, simply `git clone https://github.com/mxgordon/WebGL-Projects.git`, and nothing else is needed as long as you have a brower installed (I have only tested it for Chrome & Edge, so others may or may not work).

## SVG Editor/Viewer

First, open the `index.html` in your browser. Then you can optionally open any of the SVGs in the `/files/` folder to view. 

To draw, right-click in any two points to draw a line between them. Additionally, you can pan with the left click and rotate with the scroll wheel.

Finally, the final SVG can be exported and downloaded with the `Download SVG` button.

## Animated Subdividing Cube

After opening `index.html` in your browser you can use any of the following keybinds to animate and change the view.

 - `m`: Toggles the wireframe vs shaded view of the shape
 - `a`: Toggles the animation (the shape moving around the track)
 - `l`: Switches between Gouraud and Phong shading
 - `e`: Will subdivide the shape further (maximum 5 subdivisions)
 - `q`: Will unsubdivide the shape
 - `i`: Will subdivide the track (maximum 8 subdivisions)
 - `j`: Will unsubdivide the track

## OBJ Scene Renderer

After opening `index.html` in your browser, you can use any of the following keybinds to animate and change the view.

 - `l`: Toggle the lighting from the lamp
 - `c`: Toggle the motion of the camera around the scene
 - `m`: Toggle the motion of the car
 - `s`: Toggle the projected shadows from the car
 - `e`: Toggle the skybox around the scene
 - `d`: Toggle whether the camera moves freely or is locked to the bunny in the scene
 - `r`: Toggle the car's reflections
 - `f`: Toggle the transparency of the bunny

## Ray Tracer

After opening `index.html' in your browser, you will see 3 different possible scenes, each showcasing a feature of this raytracing engine

 - Scene 1 demonstrates reflections and shadows on a curved surface, and reflected specular highlights.
 - Scene 2 demonstrates recursive reflections (up to the recursion limit)
 - Scene 3 demonstrates complex reflections and a fully lit scene