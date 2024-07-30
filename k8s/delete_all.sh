kubectl delete -f parser/ 
kubectl delete -f attachment-manager/ 
kubectl delete -f virus-scanner/ 
kubectl delete -f image-analyzer/ 
kubectl delete -f image-recognizer/ 
kubectl delete -f message-analyzer/ 
#kubectl delete -f gs-algorithm/ 
kubectl delete -f nsfw-detector/
kubectl get pods --no-headers | grep '^sys-pod' | awk '{print $1}' | xargs kubectl delete pod