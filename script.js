const messageForm = document.querySelector(".prompt__form");
const chatHistoryContainer = document.querySelector(".chats");
const suggestionItems = document.querySelectorAll(".suggests__item");

const themeToggleButton = document.getElementById("themeToggler");
const clearChatButton =document.getElementById("deleteButton");

//variables de estado

let currentUserMessage = null;
let isGeneratingResponse = false;

const GOOGLE_API_KEY = 'AIzaSyDJGX50Yh3-75HLxR932QiLKQCMITTA6Xw';
const API_REQUEST_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GOOGLE_API_KEY}`;

//datos guardados de localstorage 

const loadSavedChatHistory = () =>{
    const savedConversations = JSON.parse(localStorage.getItem("saved-api-chats")) || [];
    const isLightTheme = localStorage.getItem("theme-color") === "light_mode";

    document.body.classList.toggle("light_mode",isLightTheme);
    themeToggleButton.innerHTML = isLightTheme ? '<i class="bx bx-moon"></i>' : '<i class = "bx bx-sun"></i>';

    chatHistoryContainer.innerHTML = '';

    //iterar el historial guardado y mostrar mensajes
    savedConversations.array.forEach(conversation => {
        //mostrar el mensaje del usuario
        const currentUserMessageHtml = `
            <div class="message__content">
                <img class="message__avatar" src="assets/profile.png" alt="User avatar">
                <p class="message__text">${conversation.userMessage}</p>
        `;


        const outgoingMessageElement = createChatMessageElement(UserMessageHtml,"message--outgoing");
        chatHistoryContainer.appendChild(outgoingMessageElement);

        //Muestra la respuesta de la api
        const responseText= conversation.apiResponse?.conditates?.[0]?.content?.parts?.[0]?.text;

        const parsedApiResponse = marked.parse(responseText); //Convertir a HTML
        const rawApiResponse = responseText; //texto plano

        const responseHtml = `
            <div class= "message__content">
                <img class = "message__avatar" src= "assets/gemini.svg" alt="Gemini Avatar">
                <p class="message__text"></p>
                <div class="message__loading-indicator hide">
                    <div class= "message__loading-bar"></div>
                    <div class= "message__loading-bar"></div>
                    <div class= "message__loading-bar"></div>
                </div>
            </div>
            <span onClick="copyMessageToClipboard(this)" class= "message__icon hide"><i class='bx bx-copy-alt'></i></span>
        
        `;

        const incomingMessageElement = createChatMessageElement(responseHtml, "message--incoming");
        chatHistoryContainer.appendChild(incomingMessageElement);

        const messageTextElement = incomingMessageElement.querySelector(".message__text");

        //mostrar chat guardado

        showTypingEffect(rawApiResponse, parsedApiResponse, messageTextElement, incomingMessageElement,true);

    });

    document.body.classList.toggle("hide-header",savedConversations.length > 0);

};


//crear un nuevo chat

const createChatMessageElement = a(htmlContent, ...cssClasses) => {
    const messageElement = document.createElement("div");
    messageElement.classList.add("message", ...cssClasses);
    messageElement.innerHTML = htmlContent;
    return messageElement;
}


//efecto al escribir

const showTypingEffect = (rawText, htmlText, messageElement, incomingMessageElement,skipEffect = false) => {
    const copyIconElement = incomingMessageElement.querySelector(".message__icon");
    copyIconElement.classList.add("hide");

    if(skipEffect){
        messageElement.innerHTML = htmlText;
        hljs.highlightAll();
        addCopyButtonToCodeBlocks();
        copyIconElement.classList.remove("hide");
        isGeneratingResponse = false;
        return;
    }

    const wordsArray = rawText.split(' ');
    let wordIndex = 0;

    const typingInterval = setInterval(() => {
        messageElement.innerHTML += (wordIndex === 0 ? '' : ' ') + wordsArray[wordIndex++];
        if(wordIndex === wordsArray.length){
            clearInterval(typingInterval);
            isGeneratingResponse = false;
            messageElement.innerHTML=htmlText;
            hljs.highlightAll();
            addCopyButtonToCodeBlocks("");
            copyIconElement.classList.remove("hide");
        }
    },75);


};



//fetch api 

const requestApiResponse = async(incomingMessageElement)=>{
    const messageElement = incomingMessageElement.querySelector(".message__text");

    try{
        const response= await fetch(API_REQUEST_URL,{
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{role: "user", parts: [{text:currentUserMessage}]}]
            }),
        });
        
        const responseData = await response.json();
        if(!response.ok) throw new Error(responseData.error.message);

        const responseText = responseData?.conditates?.[0]?.content?.parts?.[0]?.text;
        if(!responseText) throw new Error("Invalid API response.");

        const parsedApiResponse = marked.parse(responseText);
        const rawApiResponse= responseText;

        showTypingEffect(rawApiResponse,parsedApiResponse,messageTextElement,incomingMessageElement);

        //guarda la conversacion en local storage

        let savedConversations = JSON.parse(localStorage.getItem("saved-api-chats")) || [];
        savedConversations.push({
            userMessage: currentUserMessage,
            apiResponse: responseData
        });

        localStorage.setItem("saved-api-chats", JSON.stringify(savedConversations));

    } catch (error){
        isGeneratingResponse = false;
        messageTextElement.innerHTML=error.message;
        messageTextElement.closest(".message").classList.add("message--error");
    } finally{
        incomingMessageElement.classList.remove("message--loading");

    }
};



// boton copiar a los bloques de codigo

const addCopyButtonToCodeBlocks = () =>{
    const codeBLocks = document.querySelectorAll('pre');
    codeBLocks.forEach((block) =>{
        const codeElement = block.querySelector('code');
        let language = [...codeElement.classList].find(clas =>clas.startsWith('languaje-'))?.replace('language-','') || 'Text';

        const languageLabel = document.createElement('div');
        languageLabel.innerText = language.charAt(0).toUpperCase() + language.slice(1);
        languageLabel.classList.add('code__language--label');
        block.appendChild(languageLabel);

        const copyButton = document.createElement('button');
        copyButton.innerHTML = `<i class='bx bx-copy'></i>`;
        copyButton.classList.add('code__copy-btn');
        block.appendChild(copyButton);
        
        copyButton.addEventListener('click', () =>{
            navigator.clipboard.writeText(codeElement.innerText).then(() =>{
                copyButton.innerHTML = `<i class='bx bx-check'></i>`;
                setTimeout(() => copyButton.innerHTML =`<i class='bx bx-copy'></i>`,2000);
            }).catch(err =>{
                console.error("Copy failed:",err);
                alert("Unable to copy text");
            });
        });
    });
};

//Mostrar animacion de carga al hacer la request al api 
const displayLoadingAnimation = ()=>{
    const loadingHtml = `
    
        <div class="message__content">
            <img class="message__avatar" src"assets/gemini.svg" alt="Gemini avatar">
            <p class="message__text"></p>
            <div class= "message__loading-indicator">
                <div class="message__loading-bar"></div>
                <div class="message__loading-bar"></div>
                <div class="message__loading-bar"></div>
            </div>
        </div>
        <span onClick="copyMessageToClipboard(this)" class = "message__icon hide"><i class='bx bx-copy-alt'></i></span>

    
    `

    const loadingMessageElement = createChatMessageElement(loadingHtml, "message--incoming","message--loading");
    chatHistoryContainer.appendChild(loadingMessageElement);

    requestApiResponse(loadingMessageElement);
};

//Copiar mensaje al portapapels

const copyMessageToClipboard = (copyButton) =>{
    const messageContent = copyButton.parentElement.querySelector("message--text").innerText;

    navigator.clipboard.writeText(messageContent);
    copyButton.innerHTML = `<i class='bx bx-check'></i>`
    setTimeout(() => copyButton.innerHTML = `<i class='bx bx-copy'></i>`,1000);
};

