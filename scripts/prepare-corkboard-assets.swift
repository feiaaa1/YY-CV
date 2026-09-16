import CoreGraphics
import Foundation
import ImageIO
import UniformTypeIdentifiers

enum MatteKind: String {
  case magenta
  case checker
}

struct PixelImage {
  let width: Int
  let height: Int
  var bytes: [UInt8]
}

func loadImage(at path: String, maxDimension: Int = 1400) throws -> PixelImage {
  let url = URL(fileURLWithPath: path) as CFURL
  guard let source = CGImageSourceCreateWithURL(url, nil),
        let image = CGImageSourceCreateImageAtIndex(source, 0, nil) else {
    throw NSError(domain: "CorkboardAssets", code: 1, userInfo: [NSLocalizedDescriptionKey: "Cannot read \(path)"])
  }

  let scale = min(1, Double(maxDimension) / Double(max(image.width, image.height)))
  let width = max(1, Int((Double(image.width) * scale).rounded()))
  let height = max(1, Int((Double(image.height) * scale).rounded()))
  var bytes = [UInt8](repeating: 0, count: width * height * 4)
  let bitmapInfo = CGBitmapInfo.byteOrder32Big.rawValue | CGImageAlphaInfo.premultipliedLast.rawValue
  guard let context = CGContext(
    data: &bytes,
    width: width,
    height: height,
    bitsPerComponent: 8,
    bytesPerRow: width * 4,
    space: CGColorSpace(name: CGColorSpace.sRGB)!,
    bitmapInfo: bitmapInfo
  ) else {
    throw NSError(domain: "CorkboardAssets", code: 2, userInfo: [NSLocalizedDescriptionKey: "Cannot create image context"])
  }
  context.interpolationQuality = .high
  context.draw(image, in: CGRect(x: 0, y: 0, width: width, height: height))
  return PixelImage(width: width, height: height, bytes: bytes)
}

func isMattePixel(_ image: PixelImage, _ pixelIndex: Int, kind: MatteKind) -> Bool {
  let offset = pixelIndex * 4
  let red = Int(image.bytes[offset])
  let green = Int(image.bytes[offset + 1])
  let blue = Int(image.bytes[offset + 2])

  switch kind {
  case .magenta:
    return red > 165 && blue > 145 && green < 155 && red + blue > 365
      && red > green + 50 && blue > green + 40
  case .checker:
    let lightest = max(red, green, blue)
    let darkest = min(red, green, blue)
    return darkest > 198 && lightest - darkest < 24
  }
}

func removeConnectedMatte(from source: PixelImage, kind: MatteKind) -> PixelImage {
  var image = source
  let pixelCount = image.width * image.height
  var visited = [UInt8](repeating: 0, count: pixelCount)
  var queue = [Int]()
  queue.reserveCapacity(pixelCount / 2)

  func enqueue(_ index: Int) {
    guard visited[index] == 0, isMattePixel(image, index, kind: kind) else { return }
    visited[index] = 1
    queue.append(index)
  }

  for x in 0..<image.width {
    enqueue(x)
    enqueue((image.height - 1) * image.width + x)
  }
  for y in 0..<image.height {
    enqueue(y * image.width)
    enqueue(y * image.width + image.width - 1)
  }

  var cursor = 0
  while cursor < queue.count {
    let index = queue[cursor]
    cursor += 1
    let x = index % image.width
    let y = index / image.width
    if x > 0 { enqueue(index - 1) }
    if x + 1 < image.width { enqueue(index + 1) }
    if y > 0 { enqueue(index - image.width) }
    if y + 1 < image.height { enqueue(index + image.width) }
  }

  for index in queue {
    let offset = index * 4
    image.bytes[offset] = 0
    image.bytes[offset + 1] = 0
    image.bytes[offset + 2] = 0
    image.bytes[offset + 3] = 0
  }
  return image
}

func cropToContent(_ source: PixelImage, margin: Int = 10) -> PixelImage {
  var minX = source.width
  var minY = source.height
  var maxX = -1
  var maxY = -1
  for y in 0..<source.height {
    for x in 0..<source.width where source.bytes[(y * source.width + x) * 4 + 3] > 8 {
      minX = min(minX, x)
      minY = min(minY, y)
      maxX = max(maxX, x)
      maxY = max(maxY, y)
    }
  }
  guard maxX >= minX, maxY >= minY else { return source }
  minX = max(0, minX - margin)
  minY = max(0, minY - margin)
  maxX = min(source.width - 1, maxX + margin)
  maxY = min(source.height - 1, maxY + margin)
  let width = maxX - minX + 1
  let height = maxY - minY + 1
  var bytes = [UInt8](repeating: 0, count: width * height * 4)
  for y in 0..<height {
    let sourceOffset = ((minY + y) * source.width + minX) * 4
    let targetOffset = y * width * 4
    bytes.replaceSubrange(targetOffset..<(targetOffset + width * 4), with: source.bytes[sourceOffset..<(sourceOffset + width * 4)])
  }
  return PixelImage(width: width, height: height, bytes: bytes)
}

func writePNG(_ image: PixelImage, to path: String) throws {
  var bytes = image.bytes
  let bitmapInfo = CGBitmapInfo.byteOrder32Big.rawValue | CGImageAlphaInfo.premultipliedLast.rawValue
  guard let context = CGContext(
    data: &bytes,
    width: image.width,
    height: image.height,
    bitsPerComponent: 8,
    bytesPerRow: image.width * 4,
    space: CGColorSpace(name: CGColorSpace.sRGB)!,
    bitmapInfo: bitmapInfo
  ), let cgImage = context.makeImage() else {
    throw NSError(domain: "CorkboardAssets", code: 3, userInfo: [NSLocalizedDescriptionKey: "Cannot encode image"])
  }
  let outputURL = URL(fileURLWithPath: path)
  try FileManager.default.createDirectory(at: outputURL.deletingLastPathComponent(), withIntermediateDirectories: true)
  guard let destination = CGImageDestinationCreateWithURL(outputURL as CFURL, UTType.png.identifier as CFString, 1, nil) else {
    throw NSError(domain: "CorkboardAssets", code: 4, userInfo: [NSLocalizedDescriptionKey: "Cannot create PNG destination"])
  }
  CGImageDestinationAddImage(destination, cgImage, nil)
  guard CGImageDestinationFinalize(destination) else {
    throw NSError(domain: "CorkboardAssets", code: 5, userInfo: [NSLocalizedDescriptionKey: "Cannot finalize PNG"])
  }
}

guard CommandLine.arguments.count == 4, let kind = MatteKind(rawValue: CommandLine.arguments[1]) else {
  fputs("usage: prepare-corkboard-assets.swift <magenta|checker> <input> <output>\n", stderr)
  exit(2)
}

do {
  let loaded = try loadImage(at: CommandLine.arguments[2])
  let cleaned = cropToContent(removeConnectedMatte(from: loaded, kind: kind))
  try writePNG(cleaned, to: CommandLine.arguments[3])
  print("wrote \(cleaned.width)x\(cleaned.height) \(CommandLine.arguments[3])")
} catch {
  fputs("\(error)\n", stderr)
  exit(1)
}
