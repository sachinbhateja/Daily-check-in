document.addEventListener("DOMContentLoaded", () => {

  let provider;
  let signer;
  let contract;

  const DAY = 24 * 60 * 60; // seconds
  let countdownInterval;

  // 🔥 Base MAINNET contract address
  const CONTRACT_ADDRESS = "0x074F7bf0837ef40E042b14749Bd43bC0aCc30Aed";

  const ABI = [
    "function checkIn() external",
    "function getUser(address) view returns (uint256,uint256,uint256)"
  ];

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
      alert("MetaMask not found");
      return;
    }

    try {
      provider = new ethers.providers.Web3Provider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      signer = provider.getSigner();

      const network = await provider.getNetwork();

      // Base Mainnet = 8453
      if (network.chainId !== 8453) {
        messageEl.innerText = "❌ Please switch to Base Mainnet";
        return;
      }

      const address = await signer.getAddress();

      walletEl.innerText =
        "Wallet: " + address.slice(0, 6) + "..." + address.slice(-4);

      connectBtn.innerText = "Connected";
      connectBtn.disabled = true;

      contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);

      await loadUserData(address);

      messageEl.innerText = "✅ Wallet connected";

    } catch (err) {
      console.error("Connect error:", err);
      messageEl.innerText = "❌ Wallet connected but network mismatch";
    }
  }

  // ======================
  // LOAD USER DATA
  // ======================
  async function loadUserData(address) {
    const data = await contract.getUser(address);

    const lastCheckIn = data[0].toNumber();
    const streak = data[1].toNumber();
    const points = data[2].toNumber();

    document.getElementById("streak").innerText = streak;
    document.getElementById("points").innerText = points;

    startCountdown(lastCheckIn);
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
      messageEl.innerText =
        err.reason || "❌ Already checked in today";
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
    const nextCheckIn = lastCheckIn + DAY;
    const remaining = nextCheckIn - now;

    if (lastCheckIn === 0 || remaining <= 0) {
      countdownEl.innerText = "✅ You can check in now";
      checkInBtn.disabled = false;
      return;
    }

    checkInBtn.disabled = true;

    const h = Math.floor(remaining / 3600);
    const m = Math.floor((remaining % 3600) / 60);
    const s = remaining % 60;

    countdownEl.innerText =
      `⏳ Next check-in in ${h}h ${m}m ${s}s`;
  }

});
