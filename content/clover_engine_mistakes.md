### Absolution
There's a strong sense in the C++ and OOP community of what's the correct way to write programs. During the development of my first full-blown game engine I've come to realize that many of these best practices are self-serving and have no basis in the sense of making programming enjoyable, productive, or making the code efficient. Many of them are widely used because they provide a way to satisfy a certain, distorted, view of writing good code, but have no practical value. These practices also generate further problems which must be accounted with more elaborate "best practices".

I'm struggling to get away from this mindset, as there appears to be better ways of programming.

I'll now present the biggest false beliefs which have turned out to be harmful for my productivity, motivation, and for the performance of the currently unfinished Clover game engine.

#### Thinking in terms of objects makes programming simple
Object oriented programming had felt somewhat clumsy for me a long time, but I thought that the alternatives couldn't do any better. Being a self-taught programmer, university Java classes on software architecting really showed me how frustrating and inefficient writing and designing programs can be; spending twenty minutes drawing UML graphs with a group just to model a Monopoly game is something you shouldn't be doing if you want to get the job done. Just start typing the `MonopolyState` struct and see where the real problems occur.

Drawing an analogy to physics, solving a problem using object oriented programming is like solving an equation using the Fourier transform; you take the original problem, then transform it to another thing in the problem-space, hoping it being easier to solve. Sometimes this is useful and leads to an elegant solution, but doing so with every problem you're facing would indicate that you're out of your mind. It's a shame this took me so long to realize.

Note to self: Start by thinking a concrete solution to a specific problem. Objects might then arise, but usually not.

#### Exceptions make error handling simple
For a long time I thought that exceptions should be used for error handling because they're _the_ C++ way of doing things. Then I spent considerable amount of time thinking about questions, like how I should draw the semantic lines separating my exception classes? How much context and other information they should convey to the catcher? How the inheritance hierarchy should be formed to match the usual catching patterns? What is an exceptional situation? Should I derive from `std::exception`, or some inherited class?...

It is a problem which has an endless number of solutions, but not a single one stands out with clear benefits. I suspect that the attempt to unify the many ways of error handling in an already complex object oriented system was made under requirements so convoluted that only a really general solution could've worked. So general, that it lead to designing a global goto labeling scheme encoded in the type system. That's why I've never felt particularly good about using exceptions. It's just an overengineered solution to a problem which is so simple to be dealt at per function basis.

What I would've needed was to

	return ERR_FAIL;

which can be a bit more ugly, but the resulting code is a lot simpler. Constant mental overhead of thinking about exception safety, complicated program flow, rules of your own arbitrary exception semantics policy, and implementing RAII classes is a lot of headache for little benefit.

Note to self: Don't throw; keep the program flow simple and debugging easy.

#### RAII is the way to handle initialization and destruction
The case often is that you have to create a new type which needs to have means of initialization and destruction.

How I approached this using objects:
1. Design a class which could encapsulate the required properties, following the Single Responsibility Principle and all that good stuff.
2. Write a constructor and destructor doing all the important work.
3. Write required accessors.
4. These will be put into `std::vector` so write a move ctor, and a move assignment operator too.
5. If copying is needed, just copy-paste move-funcs and remove `std::moves`.
6. Realize that the move-constructor should be `noexcept` so that `std::containers` can use it to full extent(?) (jk, I rarely bother or remember to do this).
7. Worry about the stuff inside move-functions if they really throw or not.
8. Feel uneasy because didn't put enough thought to the `noexcept` specification, copy-and-swap idiom or something else.
9. Later realize that a new member is needed. Update class definition, add required accessors and update copy and move funcs.
10. Bonus: the new member doesn't support copy and/or move because I was lazy when I wrote that class.
11. Debug odd behavior due to forgotten update of copy or move -functions.

How I would approach this now:
1. Write a struct containing the required data.
2. Write create and destroy functions for the struct.
3. Call these at the two places where the new functionality is needed.
4. Later realize that a new member is needed, and then add it.

Note to self: Use RAII only for widely used utility classes.


#### Template metaprogramming saves programmer time
I'm still quite proud of the script registration system I managed to pull together. Too bad that C++ template implementation totally ruined it.

It works so that you can pass arbitrary (member)function pointer, or type to a script manager, and it uses template magic to figure out all the properties of the passed thing and forms a proper registration call to AngelScript. There's a few minor problems though which I didn't come to think about beforehand:
1. Generating thousands and thousands of template instantiations takes so much memory that workarounds must be used to keep 32bit MinGW from crashing and 8gb of ram being filled on my 64bit Linux laptop when building with `-j8`.
2. Symbol table gets so bloated that 32bit linker will fail on debug builds.
3. Compile times get slower by minutes. Slow compile times destroy programmer motivation.
4. Fixing bugs in the script manager is annoying because generated template errors are so long that I've had to double the buffer size of bash multiple times.
5. Fixing bugs in the script manager is hopeless because recompilation takes multiple minutes.

Note to self: Use templates only to parameterize over types, if really necessary. Generate glue code with some external tool if e.g. a scripting language must be used.


#### Use e.g. Boost instead of rolling your own
Boost is one of the most unportable libraries I've ever used. I've wasted countless hours trying to find a MinGW build which could compile Boost without errors. Every time I wanted to use a new and cool C++11 feature and updated my compiler, I could be sure that Boost wouldn't compile anymore on Windows. MinGW might also be to blame, but every other library has been working quite fine. Fortunately `std::thread` and friends are now somewhat usable on MinGW so parts of Boost can be removed from the build, which is better than nothing.

Note to self: Write your own minimal utilities on top of the OS API, which takes less time than the constant struggle with Boost or some other bloated general purpose library, and the result also compiles faster.

#### Write standard-compliant code and you're good to go
Compilers are broken, buggy, and Microsoft is slow to implement new C++ features. I really hope that I wouldn't have used some of the C++11 features (like constexpr) because now the only practical possibility on Windows is to use MinGW, which has been a great source of pain, suffering, and waste of time. Hopefully Visual Studio 2015 will change this. It probably won't.

Note to self: Always make sure that there's plan B in case something goes wrong with the cool features no-one uses or supports properly.


#### Using a script language makes the iteration cycle short
Most scripting languages are toys in the hands of a (game) programmer. Writing anything serious with them implies, that many aspects of the engine need to be exposed to the scripting language. This in turn means that in order to be efficient, C++ semantics need to be somehow matched with the scripting language semantics. This turns ugly really fast. How to transfer pointer semantics, RAII, copy and move semantics, virtual inheritance and all this stuff to the garbage collected scripting language? Possibly by a lot of meaningless glue code and hacking in the script engine.

Note to self: Use dynamic libraries to reload C++ code on the fly.

#### Don't worry about memory, `std::*` will take decent care of it
My careless using of `std::containers` has turned a major headache. Having over a million allocations per second taking over half of the frame time on Windows is a thing that could've been easily prevented.

Note to self: Preallocate everything, or at least design algorithms to use singly allocated `std::vectors` instead of e.g. `std::map` in a loop.

#### Use a build system
All general purpose build systems have features which get on the way of what you want to achieve, and don't have the features you'll need down the road. Searching for workarounds and trying to optimize poor performance isn't worth the initial saved time. Also, using complex and cryptic systems like CMake will make other people frustrated with your open source project when things don't build as they should.

Note to self: Use a simple script to build small projects. Write a [custom tool](https://github.com/crafn/clbs) having a minimal feature set to build larger projects. It's easier than you might initially think, and beating make in usability and performance is trivial. There will be bugs, but at least they can be fixed easily.
