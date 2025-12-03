# LM Studio Optimization Guide

Your llama-2-7b-chat model is timing out. Here's how to speed it up:

## 1. In LM Studio Settings:

### GPU Acceleration (Most Important!)
- Go to Settings → Hardware
- Enable "GPU Offload" 
- Set GPU layers to maximum (usually 32-40 for 7B models)
- This can make responses 10-50x faster!

### Context Length
- Reduce "Context Length" to 2048 or 1024
- Smaller context = faster responses

### Batch Size
- Increase "Batch Size" to 512 or higher
- Helps with throughput

## 2. Model Settings in Local Server Tab:

### Temperature & Tokens
- Temperature: 0.7 (already set)
- Max Tokens: Set to 800-1000 (we've optimized this in code)

### Prompt Format
- Make sure "Prompt Format" is set correctly for Llama 2
- Should be: `<s>[INST] {prompt} [/INST]`

## 3. Alternative: Try a Faster Model

If llama-2-7b-chat is still too slow, consider:
- **TinyLlama-1.1B** - Much faster, decent quality
- **Phi-2** (2.7B) - Good balance of speed and quality
- **Mistral-7B-Instruct** - Similar size but often faster

## 4. Current Configuration:

✅ Timeout increased to 120 seconds (2 minutes)
✅ Max tokens reduced to 800 for faster generation
✅ Prompt simplified for quicker processing
✅ Dream text limited to 1000 characters

## Test Again:

Restart your server and try analyzing a dream. It should work now with the 2-minute timeout!
