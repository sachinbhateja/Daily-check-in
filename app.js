document.addEventListener("DOMContentLoaded", () => {

  let provider;
  let signer;
  let contract;
  let countdownInterval;

  const DAY = 24 * 60 * 60; // seconds

  // 🔥 Base MAINNET contract
  const CONTRACT_ADDRESS = "0x074F7bf0837ef40E042b14749Bd43bC0aCc30Aed";

  // Base Mainnet
  const BASE_CHAIN_ID = 8453;
  const BASE_CHAIN_HEX = "0x2105";

  const ABI = [
    "function checkIn() external",
    "function getUser(address) view returns (uint256,uint256,uint256)"
  ];

  // Detect Base App
  const isBaseApp = !!window.ethereum?.isBaseWallet;

  // UI elements
  const connectBtn = document.getElementById("connect");
  const checkInBtn = document.getElementById("checkin");
  const walletEl = document.getElementById("wallet");
  const messageEl = document.getElementById("message");
  const countdownEl = document.getElementById("countdown");

  connectBtn.addEventListener("click", connectWallet);
  checkInBtn.addEventListener("click", checkIn);

  // ======================
  // CONNECT WALLET
  // ======================
  async function connectWallet() {
    if (!window.ethereum) {
      alert("Wallet not found");
      return;
    }

    try {
      provider = new ethers.providers.Web3Provider(window.ethereum);

      // Request accounts ONLY outside Base App
      if (!isBaseApp) {
        await provider.send("eth_requestAccounts", []);
      }

      // Ensure Base Mainnet
      const network = await provider.getNetwork();
      if (network.chainId !== BASE_CHAIN_ID) {
        await switchToBase();
        provider = new ethers.providers.Web3Provider(window.ethereum);
      }

      signer = provider.getSigner();
      const address = await signer.getAddress();

      walletEl.innerText = `Wallet: ${address.slice(0, 6)}...${address.slice(-4)}`;
      connectBtn.innerText = "Connected";
      connectBtn.disabled = true;

      contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);

      await loadUserData(address);
      messageEl.innerText = "✅ Wallet connected";

    } catch (err) {
      console.error(err);
      messageEl.innerText = "❌ Wallet connection failed";
    }
  }

  // ======================
  // SWITCH TO BASE MAINNET
  // ======================
  async function switchToBase() {
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: BASE_CHAIN_HEX }]
      });
    } catch (err) {
      if (err.code === 4902) {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [{
            chainId: BASE_CHAIN_HEX,
            chainName: "Base Mainnet",
            nativeCurrency: {
              name: "Ether",
              symbol: "ETH",
              decimals: 18
            },
            rpcUrls: ["https://mainnet.base.org"],
            blockExplorerUrls: ["https://basescan.org"]
          }]
        });
      } else {
        throw err;
      }
    }
  }

  // ======================
  // LOAD USER DATA
  // ======================
  async function loadUserData(address) {
    const [lastCheckIn, streak, points] = await contract.getUser(address);

    document.getElementById("streak").innerText = streak.toNumber();
    document.getElementById("points").innerText = points.toNumber();

    startCountdown(lastCheckIn.toNumber());
  }

  // ======================
  // CHECK IN
  // ======================
  async function checkIn() {
    if (!contract) {
      messageEl.innerText = "❌ Connect wallet first";
      return;
    }

    try {
      checkInBtn.disabled = true;
      checkInBtn.innerText = "Checking in...";
      messageEl.innerText = "";

      const tx = await contract.checkIn();
      await tx.wait();

      const address = await signer.getAddress();
      await loadUserData(address);

      messageEl.innerText = "✅ Check-in successful!";
    } catch (err) {
      messageEl.innerText = err.reason || "❌ Already checked in today";
    } finally {
      checkInBtn.innerText = "Check In";
    }
  }

  // ======================
  // COUNTDOWN
  // ======================
  function startCountdown(lastCheckIn) {
    clearInterval(countdownInterval);
    updateCountdown(lastCheckIn);

    countdownInterval = setInterval(() => {
      updateCountdown(lastCheckIn);
    }, 1000);
  }

  function updateCountdown(lastCheckIn) {
    const now = Math.floor(Date.now() / 1000);
    const remaining = lastCheckIn + DAY - now;

    if (lastCheckIn === 0 || remaining <= 0) {
      countdownEl.innerText = "✅ You can check in now";
      checkInBtn.disabled = false;
      return;
    }

    checkInBtn.disabled = true;

    const h = Math.floor(remaining / 3600);
    const m = Math.floor((remaining % 3600) / 60);
    const s = remaining % 60;

    countdownEl.innerText = `⏳ Next check-in in ${h}h ${m}m ${s}s`;
  }

});
