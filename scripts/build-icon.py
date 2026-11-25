"""Build a classic multi-size Windows ICO (DIB payloads) from assets/icon.png."""
from pathlib import Path
import struct
import zlib

source = Path('assets/icon.png').read_bytes()
assert source[:8] == b'\x89PNG\r\n\x1a\n', 'Expected a PNG icon source'
pos = 8
width = height = color_type = bit_depth = None
compressed = bytearray()
while pos < len(source):
    length = struct.unpack('>I', source[pos:pos + 4])[0]
    kind = source[pos + 4:pos + 8]
    data = source[pos + 8:pos + 8 + length]
    pos += 12 + length
    if kind == b'IHDR':
        width, height, bit_depth, color_type, compression, filtering, interlace = struct.unpack('>IIBBBBB', data)
        assert (bit_depth, color_type, interlace) == (8, 6, 0), 'Source must be non-interlaced RGBA PNG'
    elif kind == b'IDAT':
        compressed.extend(data)
    elif kind == b'IEND':
        break
assert width == height == 256
raw = zlib.decompress(compressed)
stride = width * 4
rgba = bytearray(width * height * 4)
for y in range(height):
    row_start = y * (stride + 1)
    assert raw[row_start] == 0, 'Expected PNG filter type 0'
    rgba[y * stride:(y + 1) * stride] = raw[row_start + 1:row_start + 1 + stride]

def make_dib(size: int) -> bytes:
    xor_stride = size * 4
    xor = bytearray()
    mask_stride = ((size + 31) // 32) * 4
    mask = bytearray(mask_stride * size)
    for y in range(size - 1, -1, -1):
        sy = min(height - 1, int((y + 0.5) * height / size))
        for x in range(size):
            sx = min(width - 1, int((x + 0.5) * width / size))
            i = (sy * width + sx) * 4
            r, g, b, a = rgba[i:i + 4]
            xor.extend((b, g, r, a))
            if a < 128:
                mask[(size - 1 - y) * mask_stride + x // 8] |= 0x80 >> (x % 8)
    header = struct.pack('<IiiHHIIiiII', 40, size, size * 2, 1, 32, 0, len(xor) + len(mask), 0, 0, 0, 0)
    return header + xor + mask

sizes = (256, 128, 64, 48, 32, 16)
images = [make_dib(size) for size in sizes]
header_size = 6 + 16 * len(sizes)
offset = header_size
entries = bytearray()
for size, image in zip(sizes, images):
    entries.extend(struct.pack('<BBBBHHII', size & 255, size & 255, 0, 0, 1, 32, len(image), offset))
    offset += len(image)
Path('assets/icon.ico').write_bytes(struct.pack('<HHH', 0, 1, len(sizes)) + entries + b''.join(images))
print(f'Wrote multi-resolution ICO: {Path("assets/icon.ico").stat().st_size:,} bytes ({", ".join(map(str, sizes))} px)')
