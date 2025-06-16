document.addEventListener("DOMContentLoaded", () => {

  const pinOverlay = document.getElementById("pin-overlay")
  const appContainer = document.querySelector(".app-container")
  console.log(appContainer)
  const pinInputs = document.querySelectorAll("#pin-overlay .pin-input")
  const unlockButton = document.getElementById("unlock-button")
  const forgotPinLink = document.getElementById("forgot-pin")

  // Check if PIN protection is enabled
  if (typeof PIN_REQUIRED !== "undefined" && PIN_REQUIRED) {
    // Setup PIN inputs
    setupPinInputs(pinInputs)

    // Unlock button click handler
    unlockButton.addEventListener("click", () => {
      verifyPin()
      
    })

    // Forgot PIN link handler
    forgotPinLink.addEventListener("click", (e) => {
      e.preventDefault()
      alert("Please contact support to reset your PIN.")
    })
  } else {
    // If PIN protection is disabled, remove the overlay
    pinOverlay.style.display = "none"
    appContainer.style.filter = "none"
    appContainer.style.pointerEvents = "auto"
  }

  // Set up PIN input behavior
  function setupPinInputs(inputs) {
    inputs.forEach((input, index) => {
      // Auto-focus next input when a digit is entered
      input.addEventListener("input", function () {
        if (this.value.length === 1) {
          const nextIndex = Number.parseInt(this.dataset.index) + 1
          const nextInput = document.querySelector(`#pin-overlay input[data-index="${nextIndex}"]`)
          if (nextInput) {
            nextInput.focus()
          } else {
            // If all inputs are filled, verify PIN
            const allFilled = Array.from(inputs).every((input) => input.value.length === 1)
            if (allFilled) {
              verifyPin()
            }
          }
        }
      })

      // Handle backspace to go to previous input
      input.addEventListener("keydown", function (e) {
        if (e.key === "Backspace" && this.value.length === 0) {
          const prevIndex = Number.parseInt(this.dataset.index) - 1
          const prevInput = document.querySelector(`#pin-overlay input[data-index="${prevIndex}"]`)
          if (prevInput) {
            prevInput.focus()
          }
        }
      })
    })
  }

  // Verify the entered PIN
  function verifyPin() {
    const enteredPin = Array.from(pinInputs)
      .map((input) => input.value)
      .join("")
console.log(enteredPin)
    // Send PIN to server for verification
    fetch("/api/verify-pin/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": CSRF_TOKEN,
      },
      body: JSON.stringify({ pin: enteredPin }),
    })
      .then((response) => response.json())
      .then((data) => {
        console.log(data)
        if (data.success) {
          // PIN is correct, unlock the app
          pinOverlay.style.display = "none"
          appContainer.style.filter = "none"
          appContainer.style.pointerEvents = "auto"

          // Store session token to prevent asking for PIN again in this session
          sessionStorage.setItem("chatPinVerified", "true")
        } else {
          // PIN is incorrect, show error
          showPinError("Incorrect PIN. Please try again.")

          // Clear PIN inputs
          pinInputs.forEach((input) => {
            input.value = ""
          })

          // Focus on first input
          pinInputs[0].focus()
        }
      })
      .catch((error) => {
        console.error("Error verifying PIN:", error)
        showPinError("Error verifying PIN. Please try again.")
      })
  }

  // Show PIN error message
  function showPinError(message) {
    const pinError = document.querySelector("#pin-overlay .pin-error")
    pinError.textContent = message
    pinError.style.display = "block"

    setTimeout(() => {
      pinError.style.display = "none"
    }, 3000)
  }
})
