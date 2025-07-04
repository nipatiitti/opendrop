# OpenDrop Game Controller

A web-based game controller for OpenDrop digital microfluidics hardware, allowing you to play games like Tetris using water droplets controlled by electrodes.

## 🎮 What is OpenDrop?

[OpenDrop](https://www.gaudi.ch/OpenDrop/) is an open-source digital microfluidics platform that uses electric fields to manipulate tiny water droplets on a grid of electrodes. This project bridges the gap between the physical OpenDrop hardware and interactive gaming by providing a web interface to control droplet movement and play games.

## 💡 Inspiration

This project was inspired by [Steve Mould's YouTube video](https://www.youtube.com/watch?v=rf-efIZI_Dg) where he challenged developers to create games using the OpenDrop platform. The video demonstrates the fascinating possibilities of digital microfluidics and sparked the idea to turn water droplet manipulation into interactive gaming.

## ✨ Features

- **Web Serial API Integration**: Direct communication with OpenDrop hardware through modern web browsers
- **Real-time Game Visualization**: Live display of electrode states and droplet positions
- **Tetris Implementation**: Play Tetris with water droplets as game pieces
- **Configurable Settings**: Adjustable baud rates and communication speeds
- **Extensible Game Framework**: Easy to add new games and gameplay mechanics

## 🚀 Getting Started

### Prerequisites

- Modern web browser with Web Serial API support (Chrome, Edge, Opera)
- OpenDrop hardware or compatible digital microfluidics device
- Node.js and npm/yarn/bun for development

### Installation

1. Clone the repository:

   ```bash
   git clone <repository-url>
   cd opendrop
   ```

2. Install dependencies:

   ```bash
   bun install
   ```

3. Start the development server:

   ```bash
   bun run dev
   ```

4. Open your browser and navigate to the local development URL (usually `http://localhost:5173`)

### Hardware Setup

1. Connect your OpenDrop device to your computer via USB
2. In the web interface, click "Request New Port" to select your device
3. Configure the baud rate (default: 115200)
4. Click "Start Game" to begin playing

## 🎯 How to Play

### Tetris

- The game uses water droplets as Tetris pieces (tetrominoes)
- Droplets are controlled by activating/deactivating electrodes
- Complete horizontal lines to clear them
- The game ends when pieces reach the top level

### Controls

- **A / D** or **← / →**: Move pieces left/right
- **R**: Rotate the current piece
- The game automatically moves pieces down at configurable intervals
- Special reservoir electrodes manage droplet supply and drainage

## 🛠️ Technical Architecture

### Core Components

- **Game Engine**: Abstract base class for implementing different games
- **Tetris Implementation**: Complete Tetris game logic with droplet physics
- **OpenDrop Controller**: Hardware communication and electrode management
- **Serial Interface**: Web Serial API integration for real-time communication

### Key Files

- `src/lib/games/Game.ts`: Abstract game base class
- `src/lib/games/Tetris/Tetris.ts`: Tetris game implementation
- `src/lib/components/OpenDrop.svelte`: Hardware visualization component
- `src/App.svelte`: Main application and serial communication

## 🔧 Development

### Project Structure

```
src/
├── lib/
│   ├── components/
│   │   ├── Game.svelte          # Game display component
│   │   └── OpenDrop.svelte      # Hardware visualization
│   └── games/
│       ├── Game.ts              # Abstract game class
│       ├── gameUtils.ts         # Utility functions
│       └── Tetris/
│           ├── Tetris.ts        # Tetris game logic
│           └── Tetromino.ts     # Tetris piece definitions
└── App.svelte                   # Main application
```

### Adding New Games

1. Create a new game class extending the base `Game` class
2. Implement required methods: `init()`, `tick()`, `input()`
3. Add your game to the game selection interface
4. Define game-specific electrode patterns and movement logic

### Browser Compatibility

This project requires Web Serial API support:

- ✅ Chrome 89+
- ✅ Edge 89+
- ✅ Opera 75+
- ❌ Firefox (not supported)
- ❌ Safari (not supported)

## 📡 Communication Protocol

The application communicates with OpenDrop hardware using a custom serial protocol:

- Electrode states are transmitted as binary data
- Reservoir controls manage droplet supply
- Real-time updates ensure responsive gameplay

## 🤝 Contributing

Contributions are welcome! Please feel free to submit pull requests or open issues for:

- New game implementations
- Hardware compatibility improvements
- UI/UX enhancements
- Bug fixes and optimizations

## 📄 License

This project is open source. Please check the license file for details.

## 🔗 Related Projects

- [OpenDrop](https://www.gaudi.ch/OpenDrop/): The original OpenDrop hardware project by Gaudi Labs
- [OpenDrop GitHub](https://github.com/GaudiLabs/OpenDrop): Source code and documentation
- [Steve Mould's Challenge Video](https://www.youtube.com/watch?v=rf-efIZI_Dg): The YouTube video that inspired this project
- [Digital Microfluidics](https://en.wikipedia.org/wiki/Digital_microfluidics): Learn more about the technology

## 🐛 Troubleshooting

### Common Issues

**Serial port not detected:**

- Ensure your browser supports Web Serial API
- Check that the OpenDrop device is properly connected
- Try refreshing the page and reconnecting

**Game not responding:**

- Verify the baud rate matches your hardware configuration
- Check the browser console for communication errors
- Ensure the serial port is not in use by another application

**Droplet movement issues:**

- Verify electrode connections and hardware functionality
- Check that reservoir electrodes are properly configured
- Ensure adequate droplet supply in the system
