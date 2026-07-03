/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  // Si usas el componente <Image> de Next.js, debes desactivar la optimización por defecto
  // ya que esta requiere un servidor Node.js corriendo para optimizar imágenes al vuelo.
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
