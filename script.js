// ==UserScript==
// @name         Click Button and Modify Textarea Content
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Click "Study cards" button and then modify the content of a textarea with specific class names on Anki Pro
// @author       You
// @match        https://ankipro.net/deck/*
// @grant        none
// ==/UserScript==


(function() {
    'use strict';

    class WordManager {
        constructor(wordList, wordShort, wordSentence) {
            this.wordList = wordList;
            this.wordShort = wordShort;
            this.wordSentence = wordSentence;
            this.currentIndex = 0;
        }

        getNextWord() {
            const word = this.wordList[this.currentIndex%this.wordList.length];
            this.currentIndex = this.currentIndex + 1;
            return word;
        }

        getWordShort(word) {
            const ret = this.wordShort[word];
            if (ret) {
                return ret + "<br><br>";
            }
            return '';
        }

        getWordSentence(word) {
            const ret = this.wordSentence[word];
            if (ret) {
                return ret+ "<br><br>";
            }
            return '';
        }

        hasNextWord() {
            return this.currentIndex < this.wordList.length;
        }
    }

    class ChatGPT {
        constructor(apiKey) {
            this.apiKey = apiKey;
            this.baseURL = 'https://api.openai.com/v1/chat/completions';
            this.defaultMessage = [
                { role: "system", content: "You are a helpful assistant." },
                { role: "user", content: "接下來我想要請你幫我翻譯， 所以只要我輸入一個英文字或片語就請給我以下資訊：該字詞的英文解釋及其翻譯；用英文解釋其詞性並且給予翻譯。如果是名詞，說明是不可數，還是可數。若是可數和不可數意思不同，也要各給解釋和一個英文例句例子。否則給一個解釋和一個英文例句即可。以及若是可數請給單數複數的型態。如果是動詞，請給予現在式，過去式每個詞性或用法給予如果有衍生的詞或片語，請給用英文說明並附上中文翻譯，此外也列出每個詞性或片語或不同用法，如果有說明也需要附上中文翻譯，另外每一種給我 1 個英文例句以及其翻譯；最後給我不同翻譯或者不同用法的 10 個例句。" }
            ];
        }

        async callChatGPT(userMessage) {
            const response = await fetch(this.baseURL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify({
                    model: "gpt-3.5-turbo",
                    messages: [
                        ...this.defaultMessage,
                        { role: "user", content: userMessage }
                    ],
                    temperature: 0.7
                })
            });

            const data = await response.json();
            return data.choices[0].message.content;
        }
    }

    async function modifyTextareaContent(chatgpt, wordManager) {
        const textarea = document.querySelectorAll('.tiptap.ProseMirror');
        if (textarea) {
            const observer = new MutationObserver((mutationsList, observer) => {
                for (let mutation of mutationsList) {
                    if (mutation.addedNodes.length > 0 || mutation.type === 'attributes') {
                        const saveButton = document.querySelector('.css-175oi2r.r-1i6wzkk.r-1loqt21.r-1otgn73.r-1awozwy.r-1777fci.r-1pz39u2.r-1twveaz.r-1i53x9q.r-18u37iz.r-1r8g8re.r-u9wvl5');
                        if (saveButton) {
                            observer.disconnect();
                            saveButton.addEventListener('click', function() {
                                console.log('"Save" button clicked!');
                            });
                            setTimeout(()=>{
                                saveButton.click();

                                if (wordManager.hasNextWord()) {
                                    setTimeout(()=>{
                                        console.log("Will save another word");
                                        modifyTextareaContent(chatgpt, wordManager);
                                    }, 1000);
                                } else {
                                    console.log("=====  stopped no other words need to translate ======")
                                }
                            }, 1000);
                            break;
                        }
                    }
                }
            });

            const config = { childList: true, subtree: true, attributes: true };
            observer.observe(document.body, config);

            const word = wordManager.getNextWord();
            textarea[0].innerHTML = word + " (writing explain please wait ....)";
            const explain = (await chatgpt.callChatGPT(word)).replace(/\n/g, '<br>');
            textarea[0].innerHTML = word;

            const short = wordManager.getWordShort(word);
            const setence = wordManager.getWordSentence(word);
            var answer = explain;
            if ((short + setence).length != 0) {
                answer = short + setence + "<br><br><br>" + explain;
            }
            textarea[1].innerHTML = answer;
            console.log('Textarea content modified!');
        } else {
            console.log('Textarea not found!');
        }
    }

    function clickAddNewCard(chatgpt, wordManager) {
        const addNewCardButton = document.querySelector('.css-175oi2r.r-1i6wzkk.r-1loqt21.r-1otgn73.r-1awozwy.r-1777fci.r-1pz39u2.r-1xgx6zm.r-1i53x9q.r-18u37iz.r-h3s6tt.r-u9wvl5');

        if (!addNewCardButton) {
            console.log('"add new cards" button not found!');
            return;
        }
        addNewCardButton.addEventListener('click', function() {
            console.log('"add new cards" button clicked!');
            setTimeout(()=>{
                modifyTextareaContent(chatgpt, wordManager)
            }, 1000);
        });
        addNewCardButton.click();
    }

    window.addEventListener('load', () => {
        setTimeout(() => {
            const chatgpt = new ChatGPT('YOUR CHATGPT TOKEN'); // !!!!!
            const wordList = ['test'];  // !!!!!
            const wordShort = { // !!!!!
                'hello': "你好(用於打招呼)"
            };
            const wordSentence = { // !!!!!
                'hello': "Paul says hello in the morning."
            };
            const wordManager = new WordManager(wordList, wordShort, wordSentence);
            clickAddNewCard(chatgpt, wordManager);
        }, 1000);
    });
})();

