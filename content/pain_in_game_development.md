### Simplifying
_C makes it easy to shoot yourself in the foot; C++ makes it harder, but when you do it blows your whole leg off.  -- Bjarne Stroustrup_

This document is a sequel to my [previous writing](/?path=clover/clover_engine_mistakes) where I shared things I've learned about C++ while developing my game engine. This one is more specifically about game development, being a reminder for me if I ever start to turn to the dark side again. The conclusions achieved here may not apply for others, but can give something to think about.

Here's a few innocent-looking guidelines which taken seriously could've saved me from wasting hundreds, even thousands of hours.

- use simple but powerful tools/features. Simplicity is a hugely underrated solution to future-proof your code. Writing large amounts of code relying on complex features will cause massive amounts of pain when you end up at dead end in terms of performance or maintainability. Refactoring tens of thousands lines of code won't get your game finished.

- have a short iteration cycle. As a single developer, this is a crucial thing to achieve because waiting several minutes for a change to realize decreases motivation greatly, be it a bug fix in the engine, tweak in the player controls, or even change in an art asset. Without motivation there'll be no game. This has large implicitions on the whole codebase and should be accounted for from the first minute.

It's hard to put to words how strongly these ideas should be enforced, and how to do it in practice. For example, what simplicity even means is a question with many answers. Luckily, most of them are wrong in the sense I'm talking about it. The easiest way to convey these ideas is probably by taking look at some of the real world situations I've faced.


#### Scripts
After the previous writing, I felt that I needed to do something drastic to keep myself motivated. As I previously explained, using a scripting language to implement the game logic caused enormous amounts of complexity and constant friction, being one of my worst decisions regarding the engine. So I removed the script system wrapper with all the template metaprogramming and the engine compiled 5 minutes faster.

To make up for the loss of instantaneous script recompiling I started to implement runtime dynamic library loading. Reloading a few functions from hard disk to memory and resolving pointers sounds like a simple thing to do in respect to using thousands of lines of glue code and running a virtual machine. Simple it was when I tried it with a few functions; after maybe a day of work, world generation code could be recompiled at runtime on both Windows and Linux! Removing script system seemed like the best decision after creating my own (simple) build system! This wasn't enough though, as game object logic was still hard-coded in the engine...


#### Dynamic components
My game objects consist of reusable components called nodes. These nodes could previously be created by scripting, or be hard coded into the engine. The actual game objects are [composed of the nodes in the in-game editor](../data/clover/nodes.png). It's arguable if this is a good solution, but I can't and shouldn't be reimplementing everything at the same time.

The natural, and often recommended way in C++ to achieve polymorphism is to use a base class with virtual functions. Now if I wanted to change logic of some node at runtime, I'd need to have it defined using a derived class in the dynamic library. This poses a multitude of problems. I'll go through these in the order I faced them.


#### Name mangling
I can't really query methods from the loaded library because their names are mangled, which is understandable as C++ has function overloading and everything. I have to use wrapper functions for creating and using the objects. Extra complexity, which could've been avoided if not using classes in the first place.

Game related nodes can now be moved from engine to the library and the game works correctly. Reloading the library causes a crash though...


#### Virtual dispatch
Using virtual member functions makes compiler to put a secret pointer to every instance of the type. This pointer points to a statically allocated, compiler dependent thing called a vtable, which is used to redirect virtual calls to correct functions. If a class was defined in the dynamic library, the vtable to which every instance of the class points to is baked into the library. This means that unloading the library unloads also the vtable. Reloading the library before using the objects again doesn't really help, because the library can be loaded to different memory location. So now I have objects with secret pointers pointing to random memory in my process.

There's a few possible solutions that came to my mind:
- implement my own `dlopen` which loads the library always at the same location -- not safe, compiler can possibly change the placement of vtables between compilations. Also I'd like to have runtime recompiling to work on Windows
- serialize and destroy every node before unloading the dll, deserialize everything after loading -- this would mean basically saving and loading the whole game world. I don't want to do that. I just simply want to reload a few functions
- in the C wrapper functions, don't call the virtual methods, but renamed, non-virtual versions of the methods -- this I did and it almost worked

Updating a node after reload no longer caused a crash, but the value passing between nodes did. Nodes have the ability to set callbacks which are executed when someone has sent node a value. Storing the callback is done by the standard solution, `std::function`, which now crashes for a some reason.


#### How complex can a function call be?
`std::function` depends on template parameters, so it has to be implemented in a header. It also contains virtual dispatch to accomplish its job. This means that a dynamic library using it automatically has some global data injected in it. Again, when the library is reloaded, the global data is reloaded to a different location and the `std::function`s remain to point to the unloaded library.

_\*Boom\*_

If I was using my own class, then I'd just insert a single `ENGINE_API` macro to the header and the problem would've been solved, but because it's standard library I can't really do anything about it. Now if I want to be safe from further crashes I'll have to replace all of the `std::function`s present in headers with simpler solutions: function pointers, or if some state is needed, with my own version of `std::function`.

#### Compile times
Let's assume that I've tackled the all of the dangling pointer problems, virtual destructors and everything. I start the game, make a change to the character controlling code, and compile it. 10 seconds later the game has been updated -- it takes 10 seconds to compile a single .cpp! It shouldn't even take a second! gcc tells me (`-ftime-report`) that 75% of the compilation time consists of parsing and template instantiation. Some 200 files are included from my own project, which is due to templates and poor judgement. The first thing coming to mind is applying pointer-to-implementation technique on some of the widely used manager classes to get rid of includes in those headers.

I was also instructed to see if precompiled headers could help, but they seem to have many (possibly compiler dependent) limitations and rules, and feel like a hack not solving the real problem. Instead they add to the complexity to my builds with no promise to work when something needs to be changed in the future -- a complex solution with a dead end in the horizon.


#### Pointer-to-implementation
Because I had never really used this technique, I decided to look up how the masters of C++ handle it. Herb Sutter's [GotW 100](http://herbsutter.com/gotw/_100/) has a clean-looking example how `std::unique_ptr` can be used to store private parts of a class. It took a few minutes to implement it, and when I started the game I noticed that it was still working. I was happy as it seemed that after all the problems, there was still some value to the C++11 stuff that once had felt exciting.

Then I shut down the game, and it crashes.

It turns out that `std::unique_ptr` is broken. Broken at least in the sense that it's not working the same way a raw pointer would with plain `new` and `delete`. The crash happens in a call to the manager from a class it contains, call stack looking something like this:

	~mgr()
	~impl()
	~some_member()
	mgr.get_something()
	mgr.impl->something <- crash, impl is invalid

I suspect this behavior is due to some exception safety guarantee which I don't really care about, as removing exceptions from the engine is on my to-do list. Here's what went through my mind:

- I could refactor my code a bit, maybe a lot, to make this work -- but I'd like to be able to call the managers freely
- I could implement a custom unique pointer, which wouldn't be a hard thing to do as I'm already wrapping `std::unique_ptr` (was needed for the script registration to work)
- maybe I'd just go for the simplest solution and use a plain pointer, with the bonus of getting rid of the `unique_ptr` include as well

Plain and simple it is.


#### Back to the daily routines
Now that my code compiles in a reasonable time (this paragraph is hypothetical), I can focus on the mundane problems. For example, what to do with `util::Polygon`, a class that models a simple polygon with a dynamic array of vertices causing hundreds of thousands of allocations per second? You've already guessed it, use a simpler solution. What I really need is just a few functions operating on raw arrays of vertices doing no heap allocations at all. That requires the least understanding of the language and the machine, being the simplest possible implementation. My head hurts that it wasn't the initial one.

When I look back, it's quite clear that most of my problems with the engine could've been avoided by not introducing unnecessary complexity by C++ and OOP idioms, or by the standard library, but choosing the simplest possible solution available. This means using structs & functions instead of classes, custom-generated code instead of templates, and function pointers instead of the OOP/C++ way. It would've been far more future-proof and saved me from a lot of anxiety.

All of this boils down to the fact that making changes to a simple system is a lot easier than to an already complex one. Machine, the ultimate platform can't be abstracted away in heavyweight game development, meaning that all of the fancy C++ abstractions and encapsulations often leak their implementation details to outer program. This increases the total complexity so much that someone writes a thing like this to procrastinate rather than actually go and figure out ways to make his code work.


