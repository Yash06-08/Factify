#include <stdio.h>

void towerOfHanoi(int n, char source, char destination, char auxiliary) {
    if (n == 1) {
        printf("Move disk 1 from %c to %c\n", source, destination);
        return;
    }
    // Move n-1 disks from source to auxiliary, so they are out of the way
    towerOfHanoi(n - 1, source, auxiliary, destination);
    
    // Move the nth disk from source to destination
    printf("Move disk %d from %c to %c\n", n, source, destination);
    
    // Move the n-1 disks from auxiliary to destination
   
    towerOfHanoi(n - 1, auxiliary, destination, source);

printf("%c",destination);


}



int main() {
    int n;

    // Input the number of disks
    printf("Enter the number of disks: ");
    scanf("%d", &n);

    // Call the Tower of Hanoi function
    towerOfHanoi(n, 'A', 'C', 'B'); // A, B, and C are the names of the rods

    return 0;
}
