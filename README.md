# blurplemachine
reverts discord's colors back to blurple automatically

## HOW TO

In discords data under modules you can find "discord_voice-3". Inside the folder "discrd_voice"
For example on windows (yes ik very cringe) the file path would look like this:
> C:\Users\You\AppData\Local\Discord\app-1.0.9002\modules\discord_voice-3\discord_voice\index.js

Edit this file with the editor of your choice.

At the end of the file you should see these lines:
![image](https://user-images.githubusercontent.com/62893792/123145976-664df780-d42b-11eb-9607-1bd6a3c8bb78.png)

Copy the text from [code-to-add.js](https://github.com/KnightsWhoSayNi0/blurplemachine/blob/master/code-to-add.js) and paste it in between the voice engine initialization and the module export like so:
![image](https://user-images.githubusercontent.com/62893792/123146347-c2188080-d42b-11eb-9856-b841ef523833.png)

And voila!
Discord should now revert to it's correct colors on startup and you should see this message in the console:
![image](https://user-images.githubusercontent.com/62893792/123146711-34896080-d42c-11eb-9589-ba7d7db4031e.png)

## Other Stuff
This is a really simple fix so I hope I didn't screw anything up lol.
If you have any questions/comments please feel free to contact me.
