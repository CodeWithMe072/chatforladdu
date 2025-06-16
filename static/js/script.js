// DOM Elements

const sidebar = document.getElementById("sidebar");
const chatContainer = document.getElementById("chat-container");
const backBtn = document.getElementById("back-btn");
const contactsList = document.getElementById("contacts-list");
const userAvatarImg = document.querySelector('.user-avatar-img')
const messagesContainer = document.getElementById("messages-container");
const messageInput = document.getElementById("message-input");
const sendBtn = document.getElementById("send-btn");
const searchInput = document.getElementById("search-input");
const currentChatUser = document.getElementById("current-chat-user");
const profileSection = document.getElementById("profile-section");
const profileBackBtn = document.getElementById("profile-back-btn");
const profileName = document.getElementById("profile-name");
const profileUsername = document.getElementById("profile-username");
const profileBio = document.getElementById("profile-bio");
const profileAvatar = document.getElementById("profile-avatar");
const profileStatus = document.getElementById("profile-status");
const attachmentBtn = document.getElementById("attachment-btn");
const mediaModal = document.getElementById("media-modal");
const closeMediaModal = document.getElementById("close-media-modal");
const imageUpload = document.getElementById("image-upload");
const videoUpload = document.getElementById("video-upload");
const mediaPreview = document.getElementById("media-preview");
const sendMediaBtn = document.getElementById("send-media-btn");
const callBtn = document.getElementById("call-btn");
const callModal = document.getElementById("call-modal");
const endCallBtn = document.getElementById("end-call-btn");
const callUserName = document.getElementById("call-user-name");
const callUserAvatar = document.getElementById("call-user-avatar");
const replyContainer = document.getElementById("reply-container");
const replyText = document.getElementById("reply-text");
const replySender = document.getElementById("reply-sender");
const closeReplyBtn = document.getElementById("close-reply-btn");

// App State
let currentChat = null;
let currentChatUsername = null;
let chatSocket = null;
let selectedMedia = null;
let replyingTo = null;
let reconnectAttempts = 0;
const maxReconnectAttempts = 5;
const reconnectInterval = 3000; // 3 seconds

// Create connection status indicator
const connectionStatus = document.createElement("div");
connectionStatus.className = "connection-status";
connectionStatus.textContent = "Disconnected";
document.body.appendChild(connectionStatus);


document.addEventListener("DOMContentLoaded", () => {
  init();
  

});

// Initialize the app
function init() {
  setupEventListeners();

  // If there are contacts in the sidebar, select the first one
  const firstContact = document.querySelector(".contact-item");
  if (firstContact) {
    const contactId = firstContact.dataset.id;
    const contactUsername = firstContact.dataset.username;
    const profileImg = firstContact.dataset.img || '/static/images/laddu.png';

    openChat(contactId, contactUsername, profileImg);
  }
}

// Connect to WebSocket
function connectWebSocket(username) {
  console.log("Connecting WebSocket...");

  if (chatSocket && chatSocket.readyState !== WebSocket.CLOSED) {
    chatSocket.close(); // Close previous socket if open
  }

  const wsUrl = `${WS_PATH}${username}/`;
  chatSocket = new WebSocket(wsUrl);

  chatSocket.onopen = () => {
    console.log("WebSocket connected");
    connectionStatus.textContent = "Connected";
    connectionStatus.classList.remove("reconnecting");
    connectionStatus.classList.add("connected", "visible");

    setTimeout(() => {
      connectionStatus.classList.remove("visible");
    }, 3000);

    reconnectAttempts = 0;

    chatSocket.send(
      JSON.stringify({
        type: "status",
        status: "online",
      })
    );
  };

  chatSocket.onmessage = (e) => {
    try {
      const data = JSON.parse(e.data);
      handleWebSocketMessage(data);
    } catch (err) {
      console.error("Invalid message format:", err);
    }
  };

  chatSocket.onclose = (e) => {
    console.warn(`WebSocket closed: ${e.code}`, e.reason || "");

    connectionStatus.textContent = "Disconnected";
    connectionStatus.classList.remove("connected");
    connectionStatus.classList.add("visible");

    if (e.code !== 1000 && reconnectAttempts < maxReconnectAttempts) {
      reconnectAttempts++;
      connectionStatus.textContent = `Reconnecting... (${reconnectAttempts}/${maxReconnectAttempts})`;
      connectionStatus.classList.add("reconnecting");

      setTimeout(() => {
        if (currentChatUsername) {
          connectWebSocket(currentChatUsername);
        }
      }, reconnectInterval);
    }
  };

  chatSocket.onerror = (err) => {
    console.error("WebSocket error:", err);
    connectionStatus.textContent = "Connection Error";
    connectionStatus.classList.remove("connected");
    connectionStatus.classList.add("visible");
  };
}


// Handle WebSocket messages
function handleWebSocketMessage(data) {
  switch (data.type) {
    case "chat_message":
      receiveMessage(data);
      break;
    case "typing":
      handleTypingIndicator(data);
      break;
    case "status":
      updateUserStatus(data);
      break;
    case "message_delivered":
      updateMessageDeliveryStatus(data);
      break;
    case "message_read":
      updateMessageReadStatus(data);
      break;
    default:
      console.log("Unknown message type:", data.type);
  }
}

// Receive a message from WebSocket
function receiveMessage(data) {
  if (data.sender_id !== CURRENT_USER_ID) {
    // Create message element
    const messageElement = document.createElement("div");
    messageElement.className = "message received";
    messageElement.dataset.id = data.message_id;

    let messageContent = "";

    // Check if this message is a reply to another message
    if (data.reply_to) {
      messageContent += `
        <div class="reply-message">
          <div class="reply-message-sender">${data.reply_to_sender === CURRENT_USER_ID
          ? "You"
          : data.reply_to_sender_name
        }</div>
          <div>${data.reply_to_text}</div>
        </div>
      `;
    }

    // Add message content based on type
    if (data.message_type === "text") {
      messageContent += `
        <div class="message-content">
          <div class="message-text">${data.message}</div>
          <div class="message-time">${data.timestamp}</div>
        </div>
      `;
    } else if (data.message_type === "image") {
      messageContent += `
        <div class="message-media">
          <img src="${data.media_url}" loading="lazy" decoding="async" alt="Image">
        </div>
        <div class="message-content">
          <div class="message-text">${data.message || ""}</div>
          <div class="message-time">${data.timestamp}</div>
        </div>
      `;
    } else if (data.message_type === "video") {
      messageContent += `
        <div class="message-media">
          <video controls>
            <source src="${data.media_url}" type="video/mp4">
            Your browser does not support the video tag.
          </video>
        </div>
        <div class="message-content">
          <div class="message-text">${data.message || ""}</div>
          <div class="message-time">${data.timestamp}</div>
        </div>
      `;
    }

    messageElement.innerHTML = messageContent;

    // Add context menu for message options
    messageElement.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      setReplyingTo({
        id: data.message_id,
        text: data.message,
        sender: data.sender_id,
        senderName: data.sender_name,
      });
    });

    // Add long press for mobile
    let pressTimer;
    messageElement.addEventListener("touchstart", () => {
      pressTimer = setTimeout(() => {
        setReplyingTo({
          id: data.message_id,
          text: data.message,
          sender: data.sender_id,
          senderName: data.sender_name,
        });
      }, 600);
    });

    messageElement.addEventListener("touchend", () => {
      clearTimeout(pressTimer);
    });

    messagesContainer.appendChild(messageElement);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    // Send read receipt
    sendReadReceipt(data.message_id);
  }

  // Update last message in contacts list
  updateContactLastMessage(data.sender_id, data.message, data.timestamp);
}

// Handle typing indicator
function handleTypingIndicator(data) {
  // Remove any existing typing indicator
  const existingIndicator = document.querySelector(".typing-indicator");
  if (existingIndicator) {
    existingIndicator.remove();
  }

  if (data.is_typing && data.sender_id !== CURRENT_USER_ID) {
    const typingIndicator = document.createElement("div");
    typingIndicator.className = "typing-indicator";
    typingIndicator.innerHTML = "<span></span><span></span><span></span>";
    messagesContainer.appendChild(typingIndicator);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    // Auto-remove typing indicator after 5 seconds if no new one arrives
    setTimeout(() => {
      if (typingIndicator.parentNode === messagesContainer) {
        typingIndicator.remove();
      }
    }, 5000);
  }
}

// Update user online status
function updateUserStatus(data) {
  const contactItems = document.querySelectorAll(
    `.contact-item[data-id="${data.user_id}"]`
  );
  contactItems.forEach((item) => {
    const statusIndicator = item.querySelector(".status-indicator");
    if (statusIndicator) {
      if (data.status === "online") {
        statusIndicator.classList.add("online");
        statusIndicator.classList.remove("offline");
      } else {
        statusIndicator.classList.remove("online");
        statusIndicator.classList.add("offline");
      }
    }
  });

  // Update current chat user status if applicable
  if (currentChat === data.user_id) {
    const statusText = currentChatUser.querySelector(".user-details p");
    if (statusText) {
      statusText.textContent = data.status === "online" ? "Online" : "Offline";
    }

    const statusIndicator = currentChatUser.querySelector(".status-indicator");
    if (statusIndicator) {
      if (data.status === "online") {
        statusIndicator.classList.add("online");
        statusIndicator.classList.remove("offline");
      } else {
        statusIndicator.classList.remove("online");
        statusIndicator.classList.add("offline");
      }
    }
  }
}

// Update message delivery status
function updateMessageDeliveryStatus(data) {
  const messageElement = document.querySelector(
    `.message[data-id="${data.message_id}"]`
  );
  if (messageElement) {
    const timeElement = messageElement.querySelector(".message-time");
    if (timeElement) {
      timeElement.innerHTML = `${timeElement.textContent} <i class="fas fa-check"></i>`;
    }
  }
}

// Update message read status
function updateMessageReadStatus(data) {
  const messageElement = document.querySelector(
    `.message[data-id="${data.message_id}"]`
  );
  if (messageElement) {
    const timeElement = messageElement.querySelector(".message-time");
    if (timeElement) {
      timeElement.innerHTML = `${timeElement.textContent.split("<i")[0]
        } <i class="fas fa-check-double"></i>`;
    }
  }
}

// Send read receipt
function sendReadReceipt(messageId) {
  if (chatSocket && chatSocket.readyState === WebSocket.OPEN) {
    chatSocket.send(
      JSON.stringify({
        type: "message_read",
        message_id: messageId,
      })
    );
  }
}

// Update contact's last message
function updateContactLastMessage(contactId, message, timestamp) {
  const contactItem = document.querySelector(
    `.contact-item[data-id="${contactId}"]`
  );
  if (contactItem) {
    const lastMessageElement = contactItem.querySelector(
      ".contact-last-message"
    );
    const timeElement = contactItem.querySelector(".contact-time");

    if (lastMessageElement) {
      lastMessageElement.textContent = message;
    }

    if (timeElement) {
      timeElement.textContent = timestamp;
    }

    // Move this contact to the top of the list
    const parentNode = contactItem.parentNode;
    parentNode.insertBefore(contactItem, parentNode.firstChild);
  }
}

// Set up reply to a message
function setReplyingTo(message) {
  replyingTo = message;
  replyContainer.classList.add("active");
  replyText.textContent = message.text;
  replySender.textContent =
    message.sender === CURRENT_USER_ID ? "You" : message.senderName;
}

// Clear reply state
function clearReply() {
  replyingTo = null;
  replyContainer.classList.remove("active");
  replyText.textContent = "";
  replySender.textContent = "";
}

// Open chat with a contact
function openChat(contactId, username, profileImg) {
  currentChat = contactId;
  currentChatUsername = username;
  console.log('jhgjdsjgfjdsgjsd', contactId)
  console.log("enter the open chat funation");
  // Connect to WebSocket for this chat
  connectWebSocket(username);

  const contactItems = document.querySelectorAll(".contact-item");
  contactItems.forEach((item) => {
    item.classList.remove("active");
  });

  const selectedContact = document.querySelector(
    `.contact-item[data-id="${contactId}"]`
  );
  if (selectedContact) {
    selectedContact.classList.add("active");

    // Update chat header
    const contactName =
      selectedContact.querySelector(".contact-name").textContent;
    const contactAvatar = selectedContact.querySelector(".user-avatar img").src;
    const statusClass = selectedContact
      .querySelector(".status-indicator")
      .classList.contains("online")
      ? "online"
      : "offline";
    const userAvatar = profileImg ? profileImg : "/static/images/laddu.png";
    currentChatUser.innerHTML = `
      <div class="user-avatar">
        <img src="${userAvatar}" loading="lazy" decoding="async" alt="${contactName}">
        <span class="status-indicator ${statusClass}"></span>
      </div>
      <div class="user-details">
        <h3>${contactName}</h3>
        <p>${statusClass === "online" ? "Online" : "Offline"}</p>
      </div>
    `;

    // On mobile, hide sidebar and show chat
    if (window.innerWidth < 768) {
      sidebar.classList.add("hidden");
      chatContainer.classList.remove("sidebar-visible");
    }

    // Load messages
    loadMessages(contactId);
  }
}

// Load messages for a chat
async function loadMessages(contactId) {

  messagesContainer.innerHTML = `
    <div class="loading-messages">
      <p>Loading messages...</p>
    </div>
  `;

  // Fetch messages from Django backend
  fetch(`/api/messages/${contactId}/`, {
    method: "GET",
    headers: {
      "X-CSRFToken": CSRF_TOKEN,
      "Content-Type": "application/json",
    },
  })
    .then((response) => response.json())

    .then((data) => {
      console.log(data);
      messagesContainer.innerHTML = "";

      if (data.length === 0) {
        messagesContainer.innerHTML = `
      <div class="welcome-message">
        <h2>No messages yet</h2>
        <p>Start a conversation with this contact</p>
      </div>
    `;
        return;
      }

      data.messages.forEach((message) => {
        const messageElement = document.createElement("div");
        const isSentByCurrentUser = String(message.sender_id) === String(CURRENT_USER_ID);
        messageElement.className = `message ${isSentByCurrentUser ? "sent" : "received"}`;
        messageElement.dataset.id = message.id;
        let messageContent = "";

        if (message.reply_to) {
          messageContent += `
        <div class="reply-message">
          <div class="reply-message-sender">${message.reply_to_sender === CURRENT_USER_ID
              ? "You"
              : message.reply_to_sender_name
            }</div>
          <div>${message.reply_to_text}</div>
        </div>
      `;
        }

        if (message.message_type === "text") {
          messageContent += `
        <div class="message-content">
          <div class="message-text">${message.message}</div>
          <div class="message-time">${message.timestamp}${message.is_read
              ? ' <i class="fas fa-check-double"></i>'
              : ' <i class="fas fa-check"></i>'
            }</div>
        </div>
      `;
        } else if (message.message_type === "image") {
          messageContent += `
        <div class="message-media">
          <img src="${message.media_url}" loading="lazy" decoding="async" alt="Image">
        </div>
        <div class="message-content">
          <div class="message-text">${message.message || ""}</div>
          <div class="message-time">${message.timestamp}${message.is_read
              ? ' <i class="fas fa-check-double"></i>'
              : ' <i class="fas fa-check"></i>'
            }</div>
        </div>
      `;
        } else if (message.message_type === "video") {
          messageContent += `
        <div class="message-media">
          <video controls>
            <source src="${message.media_url}" type="video/mp4">
            Your browser does not support the video tag.
          </video>
        </div>
        <div class="message-content">
          <div class="message-text">${message.message || ""}</div>
          <div class="message-time">${message.timestamp}${message.is_read
              ? ' <i class="fas fa-check-double"></i>'
              : ' <i class="fas fa-check"></i>'
            }</div>
        </div>
      `;
        }

        messageElement.innerHTML = messageContent;

        messageElement.addEventListener("contextmenu", (e) => {
          e.preventDefault();
          setReplyingTo({
            id: message.id,
            text: message.message,
            sender: message.sender_id,
            senderName: message.sender_name,
          });
        });

        let pressTimer;
        messageElement.addEventListener("touchstart", () => {
          pressTimer = setTimeout(() => {
            setReplyingTo({
              id: message.id,
              text: message.message,
              sender: message.sender_id,
              senderName: message.sender_name,
            });
          }, 600);
        });

        messageElement.addEventListener("touchend", () => {
          clearTimeout(pressTimer);
        });

        messagesContainer.appendChild(messageElement);
      });

      // Mark all messages as read
      const unreadMessages = data.messages.filter(
        (m) => !m.is_read && m.sender_id !== CURRENT_USER_ID
      );
      if (unreadMessages.length > 0) {
        unreadMessages.forEach((message) => {
          sendReadReceipt(message.id);
        });
      }

      // Scroll to bottom
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    })

    .catch((error) => {
      console.error("Error loading messages:", error);
      messagesContainer.innerHTML = `
      <div class="error-message">
        <p>Error loading messages. Please try again.</p>
      </div>
    `;
    });
}

// Send a message
function sendMessage() {
  const text = messageInput.value.trim();
  if (!text && !selectedMedia) return;

  if (!currentChat) {
    alert("Please select a contact first");
    return;
  }

  const tempId = Date.now();
  const now = new Date();
  const timeString = now.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  const messageElement = document.createElement("div");
  messageElement.className = "message sent";
  messageElement.dataset.id = tempId;

  let messageType = "text";
  let messageContent = "";

  if (replyingTo) {
    messageContent += `
      <div class="reply-message">
        <div class="reply-message-sender">
          ${replyingTo.sender === CURRENT_USER_ID ? "You" : replyingTo.senderName}
        </div>
        <div>${replyingTo.text}</div>
      </div>
    `;
  }

  if (selectedMedia) {
    const mediaUrl = URL.createObjectURL(selectedMedia);
    messageType = selectedMedia.type.startsWith("image") ? "image" : "video";

    messageContent += `
      <div class="message-media">
        ${messageType === "image"
        ? `<img src="${mediaUrl}" loading="lazy" decoding="async" alt="Image">`
        : `<video controls>
                <source src="${mediaUrl}" type="${selectedMedia.type}">
                Your browser does not support the video tag.
              </video>`
      }
      </div>
      <div class="message-content">
        <div class="message-text">${text || ""}</div>
        <div class="message-time">${timeString} <i class="fas fa-clock"></i></div>
      </div>
    `;
  } else {
    messageContent += `
      <div class="message-content">
        <div class="message-text">${text}</div>
        <div class="message-time">${timeString} <i class="fas fa-clock"></i></div>
      </div>
    `;
  }

  messageElement.innerHTML = messageContent;
  messagesContainer.appendChild(messageElement);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;

  messageInput.value = "";
  clearReply();

  if (selectedMedia) {
    // closeMediaModalFunc();

    const formData = new FormData();
    formData.append("recipient_id", currentChat);
    formData.append("message", text);
    if (selectedMedia){
      console.log('enter............')
       formData.append("media", selectedMedia);
    }
    console.log(selectedMedia)
    formData.append("message_type", messageType);
    if (replyingTo) formData.append("reply_to", replyingTo.id);

    fetch("/api/messages/send/", {
      method: "POST",
      headers: {
        "X-CSRFToken": CSRF_TOKEN,
      },
      body: formData,
    })
      .then((response) => response.json())
      .then((data) => {
        const tempMessage = document.querySelector(`.message[data-id="${tempId}"]`);
        if (tempMessage) {
          tempMessage.dataset.id = data.message_id;

          // ✅ Replace media with real URL after upload
          if (data.media_url) {
            const mediaElement = tempMessage.querySelector(".message-media img, .message-media video source");
            if (mediaElement) {
              mediaElement.src = data.media_url;
              const parentVideo = tempMessage.querySelector("video");
              if (parentVideo) parentVideo.load(); // reload updated video
            }
          }

          const timeElement = tempMessage.querySelector(".message-time");
          if (timeElement) {
            timeElement.innerHTML = `${timeString} <i class="fas fa-check"></i>`;
          }
        }

        updateContactLastMessage(currentChat, text || "Sent a " + messageType, timeString);
      })
      .catch((error) => {
        console.error("Error sending message:", error);
        const tempMessage = document.querySelector(`.message[data-id="${tempId}"]`);
        if (tempMessage) {
          const timeElement = tempMessage.querySelector(".message-time");
          if (timeElement) {
            timeElement.innerHTML = `${timeString} <i class="fas fa-exclamation-circle" style="color: red;"></i>`;
          }
        }
      });

  } else {
    // ✅ Send text-only message via WebSocket
    if (chatSocket && chatSocket.readyState === WebSocket.OPEN) {
      chatSocket.send(
        JSON.stringify({
          type: "chat",
          user: currentChat,
          msg: text,
          message_type: "text",
          reply_to: replyingTo?.id || null,
        })
      );
    } else {
      console.warn("WebSocket not connected.");
    }
  }

  selectedMedia = null;
}

// Send typing indicator
function sendTypingIndicator(isTyping) {
  if (chatSocket && chatSocket.readyState === WebSocket.OPEN && currentChat) {
    chatSocket.send(
      JSON.stringify({
        type: "typing",
        is_typing: isTyping,
        recipient_id: currentChat,
      })
    );
  }
}

// Search contacts
function searchContacts(query) {
  const contactItems = document.querySelectorAll(".contact-item");

  contactItems.forEach((item) => {
    const contactName = item
      .querySelector(".contact-name")
      .textContent.toLowerCase();
    const username = item.dataset.username.toLowerCase();

    if (
      contactName.includes(query.toLowerCase()) ||
      username.includes(query.toLowerCase())
    ) {
      item.style.display = "flex";
    } else {
      item.style.display = "none";
    }
  });
}

// Show profile
function showProfile(contactId) {
  fetch(`/api/users/${contactId}/`, {
    method: "GET",
    headers: {
      "X-CSRFToken": CSRF_TOKEN,
      "Content-Type": "application/json",
    },
  })
    .then((response) => response.json())
    .then((data) => {
      profileName.textContent = data.name;
      profileUsername.textContent = data.username;
      profileBio.textContent = data.bio || "Hey there! I'm using Django Chat.";
      profileAvatar.src = data.avatar || "/static/images/laddu.png";
      profileStatus.textContent = data.is_online ? "Online" : "Offline";
      profileSection.classList.add("active");

      // Set up profile action buttons
      document.getElementById("message-profile-btn").onclick = () => {
        profileSection.classList.remove("active");
      };

      document.getElementById("call-profile-btn").onclick = () => {
        showCallModal(contactId);
      };

      document.getElementById("video-profile-btn").onclick = () => {
        alert("Video call functionality coming soon!");
      };
    })
    .catch((error) => {
      console.error("Error loading profile:", error);
      alert("Error loading profile. Please try again.");
    });
}

// Open media modal
function openMediaModal() {
  mediaModal.classList.add("active");
}

// Close media modal
function closeMediaModalFunc() {
  mediaModal.classList.remove("active");
  mediaPreview.innerHTML = "";
  // selectedMedia = null;
  sendMediaBtn.disabled = true;
}

// Handle media selection
function handleMediaSelection(file, type) {
  if (!file) return;

  selectedMedia = file;  // ✅ store the file globally
  console.log("✅ Media selected:", file);

  mediaPreview.innerHTML = "";

  if (type === "image") {
    const img = document.createElement("img");
    img.src = URL.createObjectURL(file);
    img.loading="lazy"
    img.decoding="async"
    mediaPreview.appendChild(img);
  } else if (type === "video") {
    const video = document.createElement("video");
    video.controls = true;
    const source = document.createElement("source");
    source.src = URL.createObjectURL(file);
    source.type = file.type;
    video.appendChild(source);
    mediaPreview.appendChild(video);
  }
  sendMediaBtn.disabled = false;
}


// Show call modal
function showCallModal(contactId) {
  fetch(`/api/users/${contactId}/`, {
    method: "GET",
    headers: {
      "X-CSRFToken": CSRF_TOKEN,
      "Content-Type": "application/json",
    },
  })
    .then((response) => response.json())
    .then((data) => {
      callUserName.textContent = data.name;
      callUserAvatar.src = data.avatar || "/static/images/laddu.png";
      callModal.classList.add("active");

      // Notify the other user about the call
      if (chatSocket && chatSocket.readyState === WebSocket.OPEN) {
        chatSocket.send(
          JSON.stringify({
            type: "call_request",
            recipient_id: contactId,
            call_type: "audio",
          })
        );
      }

      // Simulate call connecting sound
      const audio = new Audio("/static/sounds/calling.mp3");
      audio.loop = true;
      audio.play().catch((e) => console.log("Audio play failed:", e));

      // Store audio reference to stop it later
      callModal.dataset.audioId = Date.now();
      window.callAudios = window.callAudios || {};
      window.callAudios[callModal.dataset.audioId] = audio;
    })
    .catch((error) => {
      console.error("Error starting call:", error);
      alert("Error starting call. Please try again.");
    });
}

// End call
function endCall() {
  // Stop the call sound
  if (
    callModal.dataset.audioId &&
    window.callAudios &&
    window.callAudios[callModal.dataset.audioId]
  ) {
    window.callAudios[callModal.dataset.audioId].pause();
    delete window.callAudios[callModal.dataset.audioId];
  }

  // Notify the other user that the call ended
  if (chatSocket && chatSocket.readyState === WebSocket.OPEN && currentChat) {
    chatSocket.send(
      JSON.stringify({
        type: "call_ended",
        recipient_id: currentChat,
      })
    );
  }

  callModal.classList.remove("active");
}

// Set up event listeners
function setupEventListeners() {

  // Show profile when clicking on user info in chat header
  currentChatUser.addEventListener("click", () => {
    if (currentChat) {
      showProfile(currentChat)  // currentChat contains the contact ID
    }
  })
  // Back button (mobile)
  backBtn.addEventListener("click", () => {
    sidebar.classList.remove("hidden");
    chatContainer.classList.add("sidebar-visible");
  });

  // Contact click
  contactsList.addEventListener("click", (e) => {
    const contactItem = e.target.closest(".contact-item")
    if (contactItem) {
      const contactId = contactItem.dataset.id
      const username = contactItem.dataset.username
      const profileImg = contactItem.dataset.img
      openChat(contactId, username, profileImg)
    }
  })

  // Send message
  sendBtn.addEventListener("click", sendMessage);
  attachmentBtn.addEventListener("click", openMediaModal)
  // Send message on Enter key
  messageInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      sendMessage();
    }
  });
  closeMediaModal.addEventListener("click", closeMediaModalFunc)
  // Typing indicator
  let typingTimer;
  messageInput.addEventListener("input", () => {
    clearTimeout(typingTimer);
    sendTypingIndicator(true);

    typingTimer = setTimeout(() => {
      sendTypingIndicator(false);
    }, 1000); 
  });

  // Handle image upload
  imageUpload.addEventListener("change", (e) => {
    if (e.target.files.length > 0) {
      handleMediaSelection(e.target.files[0], "image")  // Triggers media handling
    }
  })

  // Handle video upload
  videoUpload.addEventListener("change", (e) => {
    if (e.target.files.length > 0) {
      handleMediaSelection(e.target.files[0], "video")  // Triggers media handling
    }
  })
  // Send media
  sendMediaBtn.addEventListener("click", () => {
    sendMessage()  // Calls the main send message function
    closeMediaModalFunc()  // Closes the modal
  })

  // Search contacts
  searchInput.addEventListener("input", (e) => {
    searchContacts(e.target.value);
  });
}
