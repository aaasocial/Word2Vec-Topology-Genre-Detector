import '@testing-library/jest-dom'

// THREE.js WebGL stub -- jsdom has no WebGL
class WebGLRenderingContext {}
;(global as any).WebGLRenderingContext = WebGLRenderingContext
;(global as any).WebGL2RenderingContext = WebGLRenderingContext

// Mock canvas.getContext to return a minimal WebGL stub
;(HTMLCanvasElement.prototype as any).getContext = (contextId: string) => {
  if (contextId === 'webgl' || contextId === 'webgl2') {
    return {
      getExtension: () => null,
      getParameter: () => null,
      createBuffer: () => ({}),
      bindBuffer: () => {},
      bufferData: () => {},
      enable: () => {},
      disable: () => {},
      viewport: () => {},
      clearColor: () => {},
      clear: () => {},
      drawArrays: () => {},
      drawElements: () => {},
      createShader: () => ({}),
      shaderSource: () => {},
      compileShader: () => {},
      createProgram: () => ({}),
      attachShader: () => {},
      linkProgram: () => {},
      useProgram: () => {},
      getAttribLocation: () => -1,
      getUniformLocation: () => null,
      uniformMatrix4fv: () => {},
      uniform1f: () => {},
      uniform3fv: () => {},
      vertexAttribPointer: () => {},
      enableVertexAttribArray: () => {},
      createTexture: () => ({}),
      createFramebuffer: () => ({}),
      createRenderbuffer: () => ({}),
      getShaderParameter: () => true,
      getProgramParameter: () => true,
      getShaderInfoLog: () => '',
      getProgramInfoLog: () => '',
      deleteShader: () => {},
      deleteProgram: () => {},
    }
  }
  return null
}
