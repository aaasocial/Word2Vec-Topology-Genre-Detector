import '@testing-library/jest-dom'

// THREE.js WebGL stub -- jsdom has no WebGL
class WebGLRenderingContext {}
;(global as any).WebGLRenderingContext = WebGLRenderingContext
;(global as any).WebGL2RenderingContext = WebGLRenderingContext

// Mock canvas.getContext to return minimal stubs for 2d and WebGL
// Cache 2d context per canvas instance so repeated getContext calls return the same object
const canvas2dCache = new WeakMap<HTMLCanvasElement, any>()
;(HTMLCanvasElement.prototype as any).getContext = function (contextId: string) {
  if (contextId === '2d') {
    let cached = canvas2dCache.get(this)
    if (cached) return cached
    const calls: any[] = []
    cached = {
      fillRect: (...args: any[]) => calls.push({ method: 'fillRect', args }),
      clearRect: () => {},
      fillStyle: '',
      font: '',
      textAlign: '',
      textBaseline: '',
      fillText: () => {},
      measureText: () => ({ width: 0 }),
      save: () => {},
      restore: () => {},
      translate: () => {},
      rotate: () => {},
      _calls: calls,
    }
    canvas2dCache.set(this, cached)
    return cached
  }
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
