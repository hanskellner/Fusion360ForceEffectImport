# ![ForceEffect Import for Fusion 360](resources/64x64.png) ForceEffect Import for Fusion 360

![ForceEffect Motion Walker in Fusion 360](resources/ForceEffect%20Motion%20Walker%20in%20Fusion%20360.png)

## Installation

Follow the steps from Autodesk Help: https://knowledge.autodesk.com/support/fusion-360/troubleshooting/caas/sfdcarticles/sfdcarticles/How-to-install-an-ADD-IN-and-Script-in-Fusion-360.html

## Usage

From Autodesk ForceEffect or ForceEffect Motion open one of the sample drawings or create your own.  Select the share button from the toolbar and e-mail the drawing to yourself.  Once you get the e-mail, save the attached file (FEFile###.afe) locally. This is what you will be importing.

Or run the on-line versions located at [](https://forceeffect.autodesk.com/) and publish your drawing to your A360 account. Once published, access your A360 account, find the file and download it locally.

- Note, you may also find a Walker sample file in the samples folder. One in binary format and the other in text. Either will work for testing.

Start Autodesk Fusion 360 and from the file menu, select Scripts and Add-Ins then run ForceEffectImport. When prompted for a file, select your AFE file.

In the next dialog you are given a few options that effect the creation of the model.

- *Scale* : This will scale your model.  This is useful if the original model is very large and you will be 3D printing or creating some other hard output (laser cutter!).
- *Component Width* : The width of the "beams" that are created.
- *Extrude* : Toggle this off if you only want to create a simple sketch that reflects the original model.
- *Extrude Distance* : The height/distance to extrude the pieces.
- *Joint Hole Diameter* : The diameter of the holes added to the beams at each joint.

After you click OK, the sketches and bodies will be created.  It may take a moment or so depending on the complexity.

There will be several sketches:

- "Instructions"
- "PartsHoles"
- "Part - #"

Each "Part - #" sketch is used to create one beam which are placed on different levels.  This is necessary when creating them by extruding so that they don't intersect.  There will be a new body for each beam.

Now each body may be exported and 3D printed or used within another application.

Go from this:

![ForceEffect Motion App Walker Sample](resources/ForceEffect%20Motion%20App%20-%20Walker.jpeg)

[YouTube: Autodesk ForceEffect Motion "Walker" Sample](http://youtu.be/snXMVDMo-Rc?t=10s "Autodesk ForceEffect Motion Walker Sample")

To a 3D printed version:

![ForceEffect Motion Walker 3D Print](resources/ForceEffect%20Motion%20Walker%203D%20Print.jpeg)

The 3D printed version was created using the steps above.  After importing the walker into F360, I exported the pieces as STL files and then 3D printed those.

I also laser etched and cut the backing plexiglass from the "instructions" sketch that is created in the process.  Finally, I pinned the pieces together and mounted the fixed joints to the plexiglass.

Watch a video of it here:

<a href="http://www.youtube.com/watch?feature=player_embedded&v=nlOJGdLGP20
" target="_blank"><img src="http://img.youtube.com/vi/nlOJGdLGP20/0.jpg" 
alt="ForceEffect Motion Walker 3D Print" width="240" height="180" border="10" /></a>

Cheers!

### Version History
1.1 Updated UI input, better layout of bodies
1.0 Initial Git submit

### Wishlist
- Fusion 360
  - Allow multiple selection for export to STL.
  - Add support to the API for text elements in sketches
- ForceEffect and ForceEffect Motion
  - Add support for publishing the AFE documents as XML/JSON only rather than binary.  Note, the on-line version allows this by publishing to A360.
