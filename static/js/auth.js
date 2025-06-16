document.addEventListener("DOMContentLoaded", () => {
  // Toggle password visibility
  const togglePasswordButtons = document.querySelectorAll(".toggle-password")
  togglePasswordButtons.forEach((button) => {
    button.addEventListener("click", function () {
      const input = this.previousElementSibling
      if (input.type === "password") {
        input.type = "text"
        this.classList.remove("fa-eye")
        this.classList.add("fa-eye-slash")
      } else {
        input.type = "password"
        this.classList.remove("fa-eye-slash")
        this.classList.add("fa-eye")
      }
    })
  })

  // Multi-stage form navigation
  const nextButtons = document.querySelectorAll(".next-button")
  nextButtons.forEach((button) => {
    button.addEventListener("click", function () {
      const currentStage = this.closest(".form-stage")
      const nextStageId = this.dataset.next
      const nextStage = document.getElementById(nextStageId)

      // Validate current stage before proceeding
      if (validateStage(currentStage.id)) {
        currentStage.style.display = "none"
        nextStage.style.display = "block"
      }
    })
  })

  const backButtons = document.querySelectorAll(".back-button")
  backButtons.forEach((button) => {
    button.addEventListener("click", function () {
      const currentStage = this.closest(".form-stage")
      const prevStageId = this.dataset.back
      const prevStage = document.getElementById(prevStageId)

      currentStage.style.display = "none"
      prevStage.style.display = "block"
    })
  })

  // Profile image preview
  const profileImageInput = document.getElementById("profile-image")
  if (profileImageInput) {
    profileImageInput.addEventListener("change", function () {
      if (this.files && this.files[0]) {
        const reader = new FileReader()
        reader.onload = (e) => {
          document.getElementById("profile-image-preview").src = e.target.result
        }
        reader.readAsDataURL(this.files[0])
      }
    })
  }

  // Take photo button
  const takePhotoButton = document.querySelector(".take-photo-button")
  if (takePhotoButton) {
    takePhotoButton.addEventListener("click", () => {
      // This would typically open a camera interface
      // For simplicity, we'll just show an alert
      alert("Camera functionality would open here. This feature requires device camera access.")
    })
  }

  // PIN input handling
  const pinInputs = document.querySelectorAll(".pin-input")
  if (pinInputs.length > 0) {
    setupPinInputs(pinInputs)
  }

  const pinConfirmInputs = document.querySelectorAll(".pin-confirm-input")
  if (pinConfirmInputs.length > 0) {
    setupPinInputs(pinConfirmInputs)
  }

  // Confirm PIN button
  const confirmPinButton = document.getElementById("confirm-pin-button")
  if (confirmPinButton) {
    confirmPinButton.addEventListener("click", () => {
      const pin = Array.from(pinInputs)
        .map((input) => input.value)
        .join("")

      if (pin.length !== 6 || !/^\d+$/.test(pin)) {
        showPinError("Please enter a valid 6-digit PIN.")
        return
      }

      // Show confirm PIN inputs
      document.querySelector(".pin-confirm-container").style.display = "block"
      confirmPinButton.style.display = "none"
      document.getElementById("submit-button").style.display = "block"
    })
  }

  // Submit button (final registration)
  const submitButton = document.getElementById("submit-button")
  if (submitButton) {
    submitButton.addEventListener("click", async (e) => {
      e.preventDefault()

      const pin = Array.from(pinInputs)
        .map((input) => input.value)
        .join("")
      const confirmPin = Array.from(pinConfirmInputs)
        .map((input) => input.value)
        .join("")

      if (pin !== confirmPin) {
        showPinError("PINs do not match. Please try again.")
        return
      }

      // Set the hidden input value
      document.getElementById("chat-pin").value = pin
      const csrf_token = document.getElementById('csrf_token').value;
      const email = document.getElementById('email').value;
      const username = document.getElementById('username').value;
      const password = document.getElementById('password').value;
      const fullName = document.getElementById('full-name').value;
      const profileImage = document.getElementById('profile-image').files[0];

      const formData = new FormData();
      formData.append('username', username);
      formData.append('confirmPin', confirmPin);
      formData.append('password', password);
      formData.append('fullName', fullName);
      formData.append('email', email);
      formData.append('profile_image', profileImage);

      const response = await fetch('/register/', {
        method: 'POST',
        headers: {
          'X-CSRFToken': csrf_token
        },
        body: formData
      });

      const result = await response.json();

      if (response.ok) {
        window.location.href = '/';
      } else {
        console.log('error', result);
      }

    })
  }
})

// Set up PIN input behavior
function setupPinInputs(inputs) {
  inputs.forEach((input, index) => {
    // Auto-focus next input when a digit is entered
    input.addEventListener("input", function () {
      if (this.value.length === 1) {
        const nextIndex = Number.parseInt(this.dataset.index) + 1
        const nextInput = document.querySelector(`input[data-index="${nextIndex}"]`)
        if (nextInput) {
          nextInput.focus()
        }
      }
    })

    // Handle backspace to go to previous input
    input.addEventListener("keydown", function (e) {
      if (e.key === "Backspace" && this.value.length === 0) {
        const prevIndex = Number.parseInt(this.dataset.index) - 1
        const prevInput = document.querySelector(`input[data-index="${prevIndex}"]`)
        if (prevInput) {
          prevInput.focus()
        }
      }
    })
  })
}

// Show PIN error message
function showPinError(message) {
  const pinError = document.querySelector(".pin-error")
  pinError.textContent = message
  pinError.style.display = "block"

  setTimeout(() => {
    pinError.style.display = "none"
  }, 3000)
}

// Validate each stage of the form
function validateStage(stageId) {
  switch (stageId) {
    case "stage-1":
      const email = document.getElementById("email").value
      const username = document.getElementById("username").value
      const password = document.getElementById("password").value
      const confirmPassword = document.getElementById("confirm-password").value

      if (!email || !username || !password || !confirmPassword) {
        alert("Please fill in all required fields.")
        return false
      }

      if (password !== confirmPassword) {
        alert("Passwords do not match.")
        return false
      }

      if (password.length < 8) {
        alert("Password must be at least 8 characters long.")
        return false
      }

      return true

    case "stage-2":
      const fullName = document.getElementById("full-name").value

      if (!fullName) {
        alert("Please enter your full name.")
        return false
      }

      return true

    case "stage-3":
      // Profile picture is optional, so we always return true
      return true

    default:
      return true
  }
}
