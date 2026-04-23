import ExifReader from "exifreader";
import fs from "fs";

// Create a minimal test to inspect exifreader output structure
async function testExif() {
  // Let's check what the module exports and how tags look
  console.log("ExifReader keys:", Object.keys(ExifReader));
}

testExif();
